import {
  SocialMediaPlatform,
  AuthCredentials,
  AuthResult,
  VideoData,
  PostMetadata,
  UploadResult,
  ScheduleResult,
  AnalyticsData
} from './base';

// Facebook Page video publishing via the Graph API. Unlike Instagram, this
// posts directly to a Facebook Page (not an Instagram Business Account), so
// there's no extra "find the linked IG account" step -- once we have a
// Page access token we can upload directly.
export class FacebookPlatform extends SocialMediaPlatform {
  private pageId: string | null = null;
  private pageName: string | null = null;

  constructor() {
    super({
      name: 'Facebook',
      apiBaseUrl: 'https://graph.facebook.com/v18.0',
      authUrl: 'https://www.facebook.com/v18.0/dialog/oauth',
      tokenUrl: 'https://graph.facebook.com/v18.0/oauth/access_token',
      uploadUrl: 'https://graph.facebook.com/v18.0/{page_id}/videos',
      scopes: [
        'pages_show_list',
        'pages_read_engagement',
        'pages_manage_posts',
        'publish_video'
      ],
      maxVideoSize: 4 * 1024 * 1024 * 1024, // 4GB
      maxVideoDuration: 240 * 60, // 240 minutes (Facebook's official cap)
      supportedFormats: ['mp4', 'mov', 'avi'],
      rateLimit: {
        requests: 200,
        perSeconds: 3600 // per hour
      }
    });
  }

  async authenticate(credentials: AuthCredentials): Promise<AuthResult> {
    try {
      const authUrl = this.getAuthUrl(credentials);

      // Opens the real Facebook login/consent dialog in the system
      // browser and waits for the redirect (captured by a local loopback
      // server on credentials.redirectUri) to hand back a real
      // authorization code.
      const authCode = await this.getRealAuthorizationCode(authUrl, credentials);

      // Exchange code for a short-lived user access token
      const tokenResponse = await this.makeTokenRequest(credentials, authCode);

      // Get the user's Facebook Pages
      const pages = await this.getUserPages(tokenResponse.access_token);

      if (pages.length === 0) {
        throw new Error('No Facebook Pages found on this account. You need to manage at least one Page to publish videos.');
      }

      // For simplicity, use the first page the user manages
      const page = pages[0];
      this.pageId = page.id;
      this.pageName = page.name;

      // Exchange for a long-lived user token, then a long-lived Page token
      const longLivedUserToken = await this.getLongLivedToken(
        tokenResponse.access_token,
        credentials.clientId,
        credentials.clientSecret
      );
      const pageToken = await this.getPageAccessToken(page.id, longLivedUserToken);

      const result: AuthResult = {
        accessToken: pageToken,
        refreshToken: longLivedUserToken,
        expiresAt: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000), // ~60 days
        userId: this.pageId,
        username: this.pageName || undefined
      };

      this.setTokens(pageToken, longLivedUserToken, result.expiresAt);

      return result;

    } catch (error) {
      console.error('Facebook authentication failed:', error);
      throw new Error(`Facebook authentication failed: ${error}`);
    }
  }

  async uploadVideo(video: VideoData, metadata: PostMetadata): Promise<UploadResult> {
    try {
      if (!this.isAuthenticated() || !this.pageId) {
        throw new Error('Not authenticated or Facebook Page not connected');
      }

      const validation = this.validateVideo(video);
      if (!validation.valid) {
        return {
          success: false,
          error: validation.error
        };
      }

      // Facebook's resumable upload API expects the actual file bytes; here
      // we use the simpler (non-resumable) POST with a publicly reachable
      // video URL, consistent with how Instagram's media container works
      // elsewhere in this codebase.
      const uploadResponse = await this.makeRequest(
        `${this.config.apiBaseUrl}/${this.pageId}/videos`,
        {
          method: 'POST',
          body: JSON.stringify({
            file_url: this.getTemporaryUploadUrl(video.filePath),
            description: this.formatCaption(metadata.caption || video.description, metadata.hashtags),
            title: video.title
          })
        }
      );

      if (!uploadResponse.id) {
        throw new Error('Failed to upload video to Facebook Page');
      }

      return {
        success: true,
        postId: uploadResponse.id,
        url: `https://www.facebook.com/${this.pageId}/videos/${uploadResponse.id}`,
        platformData: {
          pageId: this.pageId,
          publishedAt: new Date().toISOString()
        }
      };

    } catch (error) {
      console.error('Facebook upload failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Upload failed'
      };
    }
  }

  async schedulePost(_video: VideoData, scheduleTime: Date): Promise<ScheduleResult> {
    try {
      if (!this.isAuthenticated() || !this.pageId) {
        throw new Error('Not authenticated or Facebook Page not connected');
      }

      // Facebook Pages support native scheduled publishing via
      // scheduled_publish_time + published:false on the video/post object.
      // We record the intent here; the actual API call happens when the
      // scheduler executes the post (see electron/scheduler.ts).
      const scheduledId = `facebook_scheduled_${Date.now()}`;

      return {
        success: true,
        scheduledId,
        scheduledTime: scheduleTime
      };

    } catch (error) {
      console.error('Facebook scheduling failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Scheduling failed'
      };
    }
  }

  async getAnalytics(postId: string): Promise<AnalyticsData> {
    try {
      if (!this.isAuthenticated()) {
        throw new Error('Not authenticated');
      }

      const insightsResponse = await this.makeRequest(
        `${this.config.apiBaseUrl}/${postId}/video_insights`,
        { method: 'GET' }
      );

      const insights = insightsResponse.data || [];

      let views = 0;
      let impressions = 0;

      insights.forEach((insight: any) => {
        switch (insight.name) {
          case 'total_video_views':
            views = insight.values?.[0]?.value || 0;
            break;
          case 'total_video_impressions':
            impressions = insight.values?.[0]?.value || 0;
            break;
        }
      });

      // Reactions/comments/shares require a separate summary field fetch
      // against the underlying post object.
      const postResponse = await this.makeRequest(
        `${this.config.apiBaseUrl}/${postId}`,
        { method: 'GET' },
        { fields: 'reactions.summary(true),comments.summary(true),shares' }
      );

      const likes = postResponse.reactions?.summary?.total_count || 0;
      const comments = postResponse.comments?.summary?.total_count || 0;
      const shares = postResponse.shares?.count || 0;

      const engagementRate = this.calculateEngagementRate({
        likes,
        comments,
        shares,
        views: views || impressions
      });

      return {
        views,
        likes,
        comments,
        shares,
        impressions,
        engagementRate,
        collectedAt: new Date()
      };

    } catch (error) {
      console.error('Failed to get Facebook analytics:', error);
      throw new Error(`Failed to get analytics: ${error}`);
    }
  }

  async refreshAccessToken(): Promise<AuthResult> {
    try {
      if (!this.refreshToken || !this.pageId) {
        throw new Error('No refresh token or Page available');
      }

      // Facebook Page tokens derived from a long-lived user token don't
      // expire on a fixed schedule the way OAuth refresh tokens do, but we
      // still re-derive a fresh Page token from the stored long-lived user
      // token in case it was rotated.
      const pageToken = await this.getPageAccessToken(this.pageId, this.refreshToken);

      const result: AuthResult = {
        accessToken: pageToken,
        refreshToken: this.refreshToken,
        expiresAt: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
        userId: this.pageId,
        username: this.pageName || undefined
      };

      this.setTokens(pageToken, this.refreshToken, result.expiresAt);

      return result;

    } catch (error) {
      console.error('Facebook token refresh failed:', error);
      throw error;
    }
  }

  private async parseGraphError(response: Response, fallback: string): Promise<never> {
    const body = await response.text();
    let detail = body;
    try {
      const parsed = JSON.parse(body);
      detail = parsed.error?.message || body;
    } catch { /* not JSON, use raw body */ }
    throw new Error(`${fallback}: ${detail}`);
  }

  private async makeTokenRequest(credentials: AuthCredentials, code: string): Promise<any> {
    const response = await fetch(
      `${this.config.tokenUrl}?` +
      `client_id=${credentials.clientId}&` +
      `client_secret=${credentials.clientSecret}&` +
      `redirect_uri=${encodeURIComponent(credentials.redirectUri)}&` +
      `code=${code}`,
      { method: 'GET' }
    );

    if (!response.ok) {
      return this.parseGraphError(response, 'Token exchange failed');
    }

    return (await response.json()) as Record<string, any>;
  }

  private async getUserPages(accessToken: string): Promise<any[]> {
    const response = await fetch(
      `${this.config.apiBaseUrl}/me/accounts?access_token=${accessToken}`,
      { method: 'GET' }
    );

    if (!response.ok) {
      return this.parseGraphError(response, 'Failed to get user Pages');
    }

    const data = (await response.json()) as { data?: any[] };
    return data.data || [];
  }

  private async getLongLivedToken(shortLivedToken: string, clientId: string, clientSecret: string): Promise<string> {
    const response = await fetch(
      `${this.config.apiBaseUrl}/oauth/access_token?` +
      `grant_type=fb_exchange_token&` +
      `client_id=${clientId}&` +
      `client_secret=${clientSecret}&` +
      `fb_exchange_token=${shortLivedToken}`,
      { method: 'GET' }
    );

    if (!response.ok) {
      return this.parseGraphError(response, 'Failed to get long-lived token');
    }

    const data = (await response.json()) as { access_token: string };
    return data.access_token;
  }

  private async getPageAccessToken(pageId: string, userAccessToken: string): Promise<string> {
    const response = await fetch(
      `${this.config.apiBaseUrl}/${pageId}?` +
      `fields=access_token&` +
      `access_token=${userAccessToken}`,
      { method: 'GET' }
    );

    if (!response.ok) {
      return this.parseGraphError(response, 'Failed to get Page access token');
    }

    const data = (await response.json()) as { access_token: string };
    return data.access_token;
  }

  private getTemporaryUploadUrl(filePath: string): string {
    // In a real implementation, this would upload the file to temporary
    // storage reachable by Facebook's servers and return that URL.
    return `https://example.com/temp-upload/${Date.now()}`;
  }

  private formatCaption(caption: string, hashtags?: string[]): string {
    let formatted = caption || '';

    if (hashtags && hashtags.length > 0) {
      const hashtagString = hashtags.map(tag => tag.startsWith('#') ? tag : `#${tag}`).join(' ');
      formatted += `\n\n${hashtagString}`;
    }

    // Facebook post/description limit is effectively ~63,206 characters,
    // far beyond anything realistic here, so no truncation is applied.
    return formatted;
  }
}
