import { SocialMediaPlatform, AuthCredentials, AuthResult, VideoData, PostMetadata, UploadResult, ScheduleResult, AnalyticsData } from './base';
import { InstagramPlatform } from './instagram';
import { TikTokPlatform } from './tiktok';
import { YouTubePlatform } from './youtube';
import { FacebookPlatform } from './facebook';
import { ipcMain } from 'electron';
import { dbService } from '../database';

export type PlatformType = 'instagram' | 'tiktok' | 'youtube' | 'facebook' | 'linkedin' | 'twitter';

export interface PlatformStatus {
  platform: PlatformType;
  connected: boolean;
  username?: string;
  accountId?: string; // social_accounts row id, used for refresh/disconnect
  expiresAt?: string;
}

// Manages OAuth connections and publishing for each supported platform.
// Unlike the previous version of this file, connection state is *not*
// kept as private in-memory PlatformConfig objects that live only for the
// lifetime of the main process -- it's read from and written to the real
// SQLite `social_accounts` table (see electron/database.ts), scoped to
// whichever user is currently logged in. This matters because:
//   1. ReelShare supports multiple local user accounts (see auth:* IPC
//      handlers) -- connection state has to be per-user, not global.
//   2. Connections need to survive app restarts, same as videos/schedules.
// The previous in-memory-only version also never actually reached a real
// platform: authenticatePlatform() called each platform's authenticate(),
// but every platform subclass short-circuited with a hardcoded
// 'simulated_<platform>_auth_code' string instead of ever opening a
// browser, so no real credential -- however correct -- could succeed.
// That's fixed in each platform subclass (see instagram.ts, tiktok.ts,
// youtube.ts, facebook.ts) via a shared loopback-redirect OAuth flow
// (electron/oauth-loopback.ts).
export class PlatformManager {
  private platforms: Map<PlatformType, SocialMediaPlatform> = new Map();

  constructor() {
    this.platforms.set('instagram', new InstagramPlatform());
    this.platforms.set('tiktok', new TikTokPlatform());
    this.platforms.set('youtube', new YouTubePlatform());
    this.platforms.set('facebook', new FacebookPlatform());
  }

  private getPlatformInstance(platformType: PlatformType): SocialMediaPlatform {
    const platform = this.platforms.get(platformType);
    if (!platform) {
      throw new Error(`Platform "${platformType}" is not supported yet`);
    }
    return platform;
  }

  // Runs the real OAuth flow (opens the system browser, waits for the
  // loopback redirect, exchanges the code for tokens) and persists the
  // resulting account + encrypted tokens to the database for this user.
  // Any previous connection for this user+platform is replaced -- the UI
  // only ever shows a single connect/disconnect toggle per platform, so
  // there's no notion of multiple simultaneous accounts per platform here.
  async authenticatePlatform(
    userId: string,
    platformType: PlatformType,
    credentials: AuthCredentials
  ): Promise<AuthResult> {
    const platform = this.getPlatformInstance(platformType);
    const authResult = await platform.authenticate(credentials);

    // Replace any existing connection for this user+platform before
    // inserting the new one (createSocialAccount has a UNIQUE constraint
    // on (user_id, platform, account_name), and the account name/username
    // returned by a fresh OAuth flow may differ from a previous one).
    await dbService.deleteSocialAccountsByPlatform(userId, platformType);

    await dbService.createSocialAccount({
      user_id: userId,
      platform: platformType,
      account_name: authResult.username || authResult.userId || platformType,
      access_token: authResult.accessToken,
      refresh_token: authResult.refreshToken || null,
      expires_at: authResult.expiresAt.toISOString()
    });

    return authResult;
  }

  // Reads this user's connection status for every supported platform
  // directly from the database -- the single source of truth for what
  // "Connected" actually means, replacing the previous version's
  // in-memory PlatformConfig map (which reset to all-disconnected on
  // every app restart and had no concept of "for which user").
  async getAllStatuses(userId: string): Promise<PlatformStatus[]> {
    const platformTypes: PlatformType[] = ['instagram', 'tiktok', 'youtube', 'facebook'];
    const statuses: PlatformStatus[] = [];

    for (const platformType of platformTypes) {
      const account = await dbService.getSocialAccountByPlatform(userId, platformType);
      if (account) {
        statuses.push({
          platform: platformType,
          connected: true,
          username: account.account_name,
          accountId: account.id,
          expiresAt: account.expires_at
        });
      } else {
        statuses.push({ platform: platformType, connected: false });
      }
    }

    return statuses;
  }

  async disconnectPlatform(userId: string, platformType: PlatformType): Promise<void> {
    await dbService.deleteSocialAccountsByPlatform(userId, platformType);
  }

  // Re-derives a fresh access token using the stored refresh token, then
  // saves the updated tokens back to the database. Requires the account
  // to have been connected via a real authenticate() call at least once
  // in this process's lifetime for platforms that need the app's Client
  // ID/Secret alongside the refresh token (Instagram/Facebook/YouTube/
  // TikTok all stash this internally after authenticate() -- see the
  // lastClientId/lastClientSecret fields in each platform subclass).
  async refreshPlatformToken(userId: string, platformType: PlatformType): Promise<AuthResult> {
    const account = await dbService.getSocialAccountByPlatform(userId, platformType);
    if (!account) {
      throw new Error(`${platformType} is not connected`);
    }

    const platform = this.getPlatformInstance(platformType);
    platform.setTokens(account.access_token, account.refresh_token, new Date(account.expires_at));

    const authResult = await platform.refreshAccessToken();

    await dbService.updateSocialAccountTokens(
      account.id,
      authResult.accessToken,
      authResult.refreshToken || null,
      authResult.expiresAt.toISOString()
    );

    return authResult;
  }

  async uploadToPlatform(
    userId: string,
    platformType: PlatformType,
    video: VideoData,
    metadata: PostMetadata
  ): Promise<UploadResult> {
    const account = await dbService.getSocialAccountByPlatform(userId, platformType);
    if (!account) {
      throw new Error(`${platformType} is not connected`);
    }

    const platform = this.getPlatformInstance(platformType);
    platform.setTokens(account.access_token, account.refresh_token, new Date(account.expires_at));

    try {
      return await platform.uploadVideo(video, metadata);
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Upload failed'
      };
    }
  }

  async scheduleToPlatform(
    userId: string,
    platformType: PlatformType,
    video: VideoData,
    scheduleTime: Date
  ): Promise<ScheduleResult> {
    const account = await dbService.getSocialAccountByPlatform(userId, platformType);
    if (!account) {
      throw new Error(`${platformType} is not connected`);
    }

    const platform = this.getPlatformInstance(platformType);
    platform.setTokens(account.access_token, account.refresh_token, new Date(account.expires_at));

    try {
      return await platform.schedulePost(video, scheduleTime);
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Scheduling failed'
      };
    }
  }

  async getPlatformAnalytics(userId: string, platformType: PlatformType, postId: string): Promise<AnalyticsData> {
    const account = await dbService.getSocialAccountByPlatform(userId, platformType);
    if (!account) {
      throw new Error(`${platformType} is not connected`);
    }

    const platform = this.getPlatformInstance(platformType);
    platform.setTokens(account.access_token, account.refresh_token, new Date(account.expires_at));

    return await platform.getAnalytics(postId);
  }
}

export const platformManager = new PlatformManager();

export function initPlatformManager(): void {
  console.log('Platform manager initialized');

  ipcMain.handle('platforms:authenticate', async (_, userId: string, platformType: PlatformType, credentials: AuthCredentials) => {
    return await platformManager.authenticatePlatform(userId, platformType, credentials);
  });

  ipcMain.handle('platforms:getAllStatuses', async (_, userId: string) => {
    return await platformManager.getAllStatuses(userId);
  });

  ipcMain.handle('platforms:disconnect', async (_, userId: string, platformType: PlatformType) => {
    return await platformManager.disconnectPlatform(userId, platformType);
  });

  ipcMain.handle('platforms:refreshToken', async (_, userId: string, platformType: PlatformType) => {
    return await platformManager.refreshPlatformToken(userId, platformType);
  });

  ipcMain.handle('platforms:upload', async (_, userId: string, platformType: PlatformType, video: VideoData, metadata: PostMetadata) => {
    return await platformManager.uploadToPlatform(userId, platformType, video, metadata);
  });

  ipcMain.handle('platforms:schedule', async (_, userId: string, platformType: PlatformType, video: VideoData, scheduleTime: string) => {
    return await platformManager.scheduleToPlatform(userId, platformType, video, new Date(scheduleTime));
  });

  ipcMain.handle('platforms:getAnalytics', async (_, userId: string, platformType: PlatformType, postId: string) => {
    return await platformManager.getPlatformAnalytics(userId, platformType, postId);
  });
}
