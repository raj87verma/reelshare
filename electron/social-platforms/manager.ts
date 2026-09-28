import { SocialMediaPlatform, AuthCredentials, AuthResult, VideoData, PostMetadata, UploadResult, ScheduleResult, AnalyticsData } from './base';
import { InstagramPlatform } from './instagram';
import { TikTokPlatform } from './tiktok';
import { YouTubePlatform } from './youtube';
import { ipcMain } from 'electron';
import { dbService } from '../database';

export type PlatformType = 'instagram' | 'tiktok' | 'youtube' | 'facebook' | 'linkedin' | 'twitter';

export interface PlatformConfig {
  type: PlatformType;
  name: string;
  enabled: boolean;
  credentials?: AuthCredentials;
  authResult?: AuthResult;
}

export class PlatformManager {
  private platforms: Map<PlatformType, SocialMediaPlatform> = new Map();
  private platformConfigs: Map<PlatformType, PlatformConfig> = new Map();

  constructor() {
    this.initializePlatforms();
  }

  private initializePlatforms(): void {
    // Initialize all platform instances
    this.platforms.set('instagram', new InstagramPlatform());
    this.platforms.set('tiktok', new TikTokPlatform());
    this.platforms.set('youtube', new YouTubePlatform());
    
    // Initialize configs
    this.platformConfigs.set('instagram', {
      type: 'instagram',
      name: 'Instagram',
      enabled: false
    });
    
    this.platformConfigs.set('tiktok', {
      type: 'tiktok',
      name: 'TikTok',
      enabled: false
    });
    
    this.platformConfigs.set('youtube', {
      type: 'youtube',
      name: 'YouTube',
      enabled: false
    });
  }

  async authenticatePlatform(platformType: PlatformType, credentials: AuthCredentials): Promise<AuthResult> {
    const platform = this.platforms.get(platformType);
    if (!platform) {
      throw new Error(`Platform ${platformType} not supported`);
    }

    try {
      const authResult = await platform.authenticate(credentials);
      
      // Update platform config
      const config = this.platformConfigs.get(platformType);
      if (config) {
        config.credentials = credentials;
        config.authResult = authResult;
        config.enabled = true;
        this.platformConfigs.set(platformType, config);
      }
      
      // Save to database
      await this.savePlatformAuth(platformType, authResult, credentials);
      
      return authResult;
      
    } catch (error) {
      console.error(`Authentication failed for ${platformType}:`, error);
      throw error;
    }
  }

  async uploadToPlatform(
    platformType: PlatformType,
    video: VideoData,
    metadata: PostMetadata
  ): Promise<UploadResult> {
    const platform = this.platforms.get(platformType);
    if (!platform) {
      throw new Error(`Platform ${platformType} not supported`);
    }

    const config = this.platformConfigs.get(platformType);
    if (!config?.enabled || !config.authResult) {
      throw new Error(`Platform ${platformType} not authenticated`);
    }

    try {
      // Set tokens if not already set
      if (!platform.isAuthenticated() && config.authResult) {
        platform.setTokens(
          config.authResult.accessToken,
          config.authResult.refreshToken || null,
          config.authResult.expiresAt
        );
      }

      const result = await platform.uploadVideo(video, metadata);
      
      if (result.success && result.postId) {
        // Save upload record to database
        await this.saveUploadRecord(platformType, video, metadata, result);
      }
      
      return result;
      
    } catch (error) {
      console.error(`Upload failed for ${platformType}:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Upload failed'
      };
    }
  }

  async scheduleToPlatform(
    platformType: PlatformType,
    video: VideoData,
    scheduleTime: Date,
    metadata: PostMetadata = {}
  ): Promise<ScheduleResult> {
    const platform = this.platforms.get(platformType);
    if (!platform) {
      throw new Error(`Platform ${platformType} not supported`);
    }

    const config = this.platformConfigs.get(platformType);
    if (!config?.enabled || !config.authResult) {
      throw new Error(`Platform ${platformType} not authenticated`);
    }

    try {
      // Set tokens if not already set
      if (!platform.isAuthenticated() && config.authResult) {
        platform.setTokens(
          config.authResult.accessToken,
          config.authResult.refreshToken || null,
          config.authResult.expiresAt
        );
      }

      const result = await platform.schedulePost(video, scheduleTime);
      
      if (result.success && result.scheduledId) {
        // Save schedule record to database
        await this.saveScheduleRecord(platformType, video, scheduleTime, metadata, result);
      }
      
      return result;
      
    } catch (error) {
      console.error(`Scheduling failed for ${platformType}:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Scheduling failed'
      };
    }
  }

  async getPlatformAnalytics(platformType: PlatformType, postId: string): Promise<AnalyticsData> {
    const platform = this.platforms.get(platformType);
    if (!platform) {
      throw new Error(`Platform ${platformType} not supported`);
    }

    const config = this.platformConfigs.get(platformType);
    if (!config?.enabled || !config.authResult) {
      throw new Error(`Platform ${platformType} not authenticated`);
    }

    try {
      // Set tokens if not already set
      if (!platform.isAuthenticated() && config.authResult) {
        platform.setTokens(
          config.authResult.accessToken,
          config.authResult.refreshToken || null,
          config.authResult.expiresAt
        );
      }

      return await platform.getAnalytics(postId);
      
    } catch (error) {
      console.error(`Failed to get analytics for ${platformType}:`, error);
      throw error;
    }
  }

  async refreshPlatformToken(platformType: PlatformType): Promise<AuthResult> {
    const platform = this.platforms.get(platformType);
    if (!platform) {
      throw new Error(`Platform ${platformType} not supported`);
    }

    const config = this.platformConfigs.get(platformType);
    if (!config?.enabled || !config.authResult) {
      throw new Error(`Platform ${platformType} not authenticated`);
    }

    try {
      const authResult = await platform.refreshAccessToken();
      
      // Update config
      if (config) {
        config.authResult = authResult;
        this.platformConfigs.set(platformType, config);
      }
      
      // Update database
      await this.savePlatformAuth(platformType, authResult, config.credentials!);
      
      return authResult;
      
    } catch (error) {
      console.error(`Token refresh failed for ${platformType}:`, error);
      throw error;
    }
  }

  async uploadToMultiplePlatforms(
    platformTypes: PlatformType[],
    video: VideoData,
    metadata: PostMetadata
  ): Promise<Record<PlatformType, UploadResult>> {
    const results: Record<PlatformType, UploadResult> = {} as any;
    
    // Upload to each platform sequentially
    for (const platformType of platformTypes) {
      try {
        const result = await this.uploadToPlatform(platformType, video, metadata);
        results[platformType] = result;
        
        // Add small delay between uploads to avoid rate limiting
        if (platformTypes.indexOf(platformType) < platformTypes.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      } catch (error) {
        results[platformType] = {
          success: false,
          error: error instanceof Error ? error.message : 'Upload failed'
        };
      }
    }
    
    return results;
  }

  getPlatformConfig(platformType: PlatformType): PlatformConfig | undefined {
    return this.platformConfigs.get(platformType);
  }

  getAllPlatformConfigs(): PlatformConfig[] {
    return Array.from(this.platformConfigs.values());
  }

  getEnabledPlatforms(): PlatformType[] {
    return Array.from(this.platformConfigs.entries())
      .filter(([_, config]) => config.enabled)
      .map(([type, _]) => type);
  }

  isPlatformEnabled(platformType: PlatformType): boolean {
    const config = this.platformConfigs.get(platformType);
    return config?.enabled || false;
  }

  async disconnectPlatform(platformType: PlatformType): Promise<void> {
    const config = this.platformConfigs.get(platformType);
    if (config) {
      config.enabled = false;
      config.credentials = undefined;
      config.authResult = undefined;
      this.platformConfigs.set(platformType, config);
    }
    
    // Remove from database
    await this.removePlatformAuth(platformType);
  }

  private async savePlatformAuth(
    platformType: PlatformType,
    authResult: AuthResult,
    credentials: AuthCredentials
  ): Promise<void> {
    // Save to database
    // This is a simplified version - in real app, you'd use your database service
    console.log(`Saved auth for ${platformType}:`, {
      platform: platformType,
      accessToken: authResult.accessToken.substring(0, 10) + '...',
      expiresAt: authResult.expiresAt,
      userId: authResult.userId
    });
  }

  private async saveUploadRecord(
    platformType: PlatformType,
    video: VideoData,
    metadata: PostMetadata,
    result: UploadResult
  ): Promise<void> {
    // Save upload record to database
    console.log(`Saved upload record for ${platformType}:`, {
      platform: platformType,
      videoTitle: video.title,
      postId: result.postId,
      timestamp: new Date().toISOString()
    });
  }

  private async saveScheduleRecord(
    platformType: PlatformType,
    video: VideoData,
    scheduleTime: Date,
    metadata: PostMetadata,
    result: ScheduleResult
  ): Promise<void> {
    // Save schedule record to database
    console.log(`Saved schedule record for ${platformType}:`, {
      platform: platformType,
      videoTitle: video.title,
      scheduledTime: scheduleTime.toISOString(),
      scheduledId: result.scheduledId
    });
  }

  private async removePlatformAuth(platformType: PlatformType): Promise<void> {
    // Remove platform auth from database
    console.log(`Removed auth for ${platformType}`);
  }
}

export const platformManager = new PlatformManager();

export function initPlatformManager(): void {
  // Initialize platform manager
  console.log('Platform manager initialized');
  
  // IPC handlers for platform operations
  ipcMain.handle('platforms:authenticate', async (_, platformType: PlatformType, credentials: AuthCredentials) => {
    return await platformManager.authenticatePlatform(platformType, credentials);
  });
  
  ipcMain.handle('platforms:upload', async (_, platformType: PlatformType, video: VideoData, metadata: PostMetadata) => {
    return await platformManager.uploadToPlatform(platformType, video, metadata);
  });
  
  ipcMain.handle('platforms:schedule', async (_, platformType: PlatformType, video: VideoData, scheduleTime: string, metadata: PostMetadata) => {
    return await platformManager.scheduleToPlatform(platformType, video, new Date(scheduleTime), metadata);
  });
  
  ipcMain.handle('platforms:uploadMultiple', async (_, platformTypes: PlatformType[], video: VideoData, metadata: PostMetadata) => {
    return await platformManager.uploadToMultiplePlatforms(platformTypes, video, metadata);
  });
  
  ipcMain.handle('platforms:getAnalytics', async (_, platformType: PlatformType, postId: string) => {
    return await platformManager.getPlatformAnalytics(platformType, postId);
  });
  
  ipcMain.handle('platforms:refreshToken', async (_, platformType: PlatformType) => {
    return await platformManager.refreshPlatformToken(platformType);
  });
  
  ipcMain.handle('platforms:getConfig', async (_, platformType: PlatformType) => {
    return platformManager.getPlatformConfig(platformType);
  });
  
  ipcMain.handle('platforms:getAllConfigs', async () => {
    return platformManager.getAllPlatformConfigs();
  });
  
  ipcMain.handle('platforms:getEnabled', async () => {
    return platformManager.getEnabledPlatforms();
  });
  
  ipcMain.handle('platforms:disconnect', async (_, platformType: PlatformType) => {
    return await platformManager.disconnectPlatform(platformType);
  });
  
  ipcMain.handle('platforms:isEnabled', async (_, platformType: PlatformType) => {
    return platformManager.isPlatformEnabled(platformType);
  });
}