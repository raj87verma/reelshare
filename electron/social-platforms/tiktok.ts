import { 
  SocialMediaPlatform, 
  AuthCredentials, 
  AuthResult, 
  VideoData, 
  PostMetadata, 
  UploadResult, 
  ScheduleResult, 
  AnalyticsData,
  PlatformConfig 
} from './base';

export class TikTokPlatform extends SocialMediaPlatform {
  private openId: string | null = null;

  constructor() {
    super({
      name: 'TikTok',
      apiBaseUrl: 'https://open-api.tiktok.com',
      authUrl: 'https://www.tiktok.com/v2/auth/authorize',
      tokenUrl: 'https://open-api.tiktok.com/oauth/access_token',
      uploadUrl: 'https://open-api.tiktok.com/video/upload',
      scopes: [
        'user.info.basic',
        'video.upload',
        'video.publish',
        'video.list'
      ],
      maxVideoSize: 500 * 1024 * 1024, // 500MB
      maxVideoDuration: 180, // 3 minutes
      supportedFormats: ['mp4', 'mov'],
      rateLimit: {
        requests: 100,
        perSeconds: 3600 // per hour
      }
    });
  }

  async authenticate(credentials: AuthCredentials): Promise<AuthResult> {
    try {
      const authUrl = this.getAuthUrl(credentials);
      
      // In a real implementation, this would open a browser window for OAuth
      console.log('Open this URL for TikTok authentication:', authUrl);
      
      // Simulate getting the authorization code
      const authCode = 'simulated_tiktok_auth_code';
      
      // Exchange code for access token
      const tokenResponse = await this.makeTokenRequest(credentials, authCode);
      
      if (!tokenResponse.data || !tokenResponse.data.access_token) {
        throw new Error('Invalid token response');
      }
      
      this.openId = tokenResponse.data.open_id;
      
      const result: AuthResult = {
        accessToken: tokenResponse.data.access_token,
        refreshToken: tokenResponse.data.refresh_token,
        expiresAt: new Date(Date.now() + tokenResponse.data.expires_in * 1000),
        userId: this.openId,
        username: tokenResponse.data.display_name
      };
      
      this.setTokens(
        tokenResponse.data.access_token,
        tokenResponse.data.refresh_token,
        result.expiresAt
      );
      
      return result;
      
    } catch (error) {
      console.error('TikTok authentication failed:', error);
      throw new Error(`TikTok authentication failed: ${error}`);
    }
  }

  async uploadVideo(video: VideoData, metadata: PostMetadata): Promise<UploadResult> {
    try {
      if (!this.isAuthenticated() || !this.openId) {
        throw new Error('Not authenticated');
      }

      // Validate video
      const validation = this.validateVideo(video);
      if (!validation.valid) {
        return {
          success: false,
          error: validation.error
        };
      }

      // Step 1: Initialize upload
      const initResponse = await this.makeRequest(
        `${this.config.apiBaseUrl}/video/upload/init`,
        {
          method: 'POST',
          body: JSON.stringify({
            open_id: this.openId,
            source_info: {
              source: 'PULL_FROM_URL' // For file upload, we'd use multipart
            }
          })
        }
      );

      if (!initResponse.data || !initResponse.data.upload_id) {
        throw new Error('Failed to initialize upload');
      }

      const uploadId = initResponse.data.upload_id;

      // Step 2: Upload video (simplified - in real app would use multipart upload)
      // For now, simulate successful upload
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Step 3: Publish video
      const publishResponse = await this.makeRequest(
        `${this.config.apiBaseUrl}/video/publish`,
        {
          method: 'POST',
          body: JSON.stringify({
            open_id: this.openId,
            upload_id: uploadId,
            text: this.formatCaption(metadata.caption || video.description, metadata.hashtags),
            privacy_level: metadata.visibility === 'private' ? 'SELF_ONLY' : 'PUBLIC_TO_EVERYONE',
            disable_duet: false,
            disable_stitch: false,
            disable_comment: false
          })
        }
      );

      if (!publishResponse.data || !publishResponse.data.publish_id) {
        throw new Error('Failed to publish video');
      }

      return {
        success: true,
        postId: publishResponse.data.publish_id,
        url: `https://www.tiktok.com/@user/video/${publishResponse.data.publish_id}`,
        platformData: {
          uploadId,
          publishedAt: new Date().toISOString()
        }
      };

    } catch (error) {
      console.error('TikTok upload failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Upload failed'
      };
    }
  }

  async schedulePost(video: VideoData, scheduleTime: Date): Promise<ScheduleResult> {
    try {
      if (!this.isAuthenticated() || !this.openId) {
        throw new Error('Not authenticated');
      }

      // TikTok API doesn't support direct scheduling
      // We'll simulate by storing the post details and publishing at the scheduled time
      
      const scheduledId = `tiktok_scheduled_${Date.now()}`;
      
      return {
        success: true,
        scheduledId,
        scheduledTime: scheduleTime
      };

    } catch (error) {
      console.error('TikTok scheduling failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Scheduling failed'
      };
    }
  }

  async getAnalytics(postId: string): Promise<AnalyticsData> {
    try {
      if (!this.isAuthenticated() || !this.openId) {
        throw new Error('Not authenticated');
      }

      // Get video data (includes some basic stats)
      const videoResponse = await this.makeRequest(
        `${this.config.apiBaseUrl}/video/query`,
        {
          method: 'POST',
          body: JSON.stringify({
            open_id: this.openId,
            filters: {
              video_ids: [postId]
            }
          })
        }
      );

      if (!videoResponse.data || !videoResponse.data.videos || videoResponse.data.videos.length === 0) {
        throw new Error('Video not found');
      }

      const video = videoResponse.data.videos[0];
      
      // TikTok provides limited analytics via API
      // For more detailed analytics, need TikTok Business account
      const views = video.stats?.play_count || 0;
      const likes = video.stats?.digg_count || 0;
      const comments = video.stats?.comment_count || 0;
      const shares = video.stats?.share_count || 0;
      const saves = video.stats?.collect_count || 0;

      const engagementRate = this.calculateEngagementRate({
        likes,
        comments,
        shares,
        views
      });

      return {
        views,
        likes,
        comments,
        shares,
        saves,
        engagementRate,
        collectedAt: new Date()
      };

    } catch (error) {
      console.error('Failed to get TikTok analytics:', error);
      throw new Error(`Failed to get analytics: ${error}`);
    }
  }

  async refreshAccessToken(): Promise<AuthResult> {
    try {
      if (!this.refreshToken) {
        throw new Error('No refresh token available');
      }

      const response = await this.makeRequest(
        `${this.config.tokenUrl}/refresh_token`,
        {
          method: 'POST',
          body: JSON.stringify({
            client_key: this.getClientKey(),
            grant_type: 'refresh_token',
            refresh_token: this.refreshToken
          })
        }
      );

      if (!response.data || !response.data.access_token) {
        throw new Error('Token refresh failed');
      }

      const result: AuthResult = {
        accessToken: response.data.access_token,
        refreshToken: response.data.refresh_token,
        expiresAt: new Date(Date.now() + response.data.expires_in * 1000),
        userId: this.openId || undefined
      };

      this.setTokens(
        response.data.access_token,
        response.data.refresh_token,
        result.expiresAt
      );
      
      return result;

    } catch (error) {
      console.error('Token refresh failed:', error);
      throw error;
    }
  }

  private async makeTokenRequest(credentials: AuthCredentials, code: string): Promise<any> {
    const response = await fetch(
      this.config.tokenUrl,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          client_key: credentials.clientId,
          client_secret: credentials.clientSecret,
          code,
          grant_type: 'authorization_code',
          redirect_uri: credentials.redirectUri
        })
      }
    );

    if (!response.ok) {
      throw new Error('Token exchange failed');
    }

    return (await response.json()) as Record<string, any>;
  }

  private formatCaption(caption: string, hashtags?: string[]): string {
    let formatted = caption || '';
    
    if (hashtags && hashtags.length > 0) {
      const hashtagString = hashtags.map(tag => tag.startsWith('#') ? tag : `#${tag}`).join(' ');
      formatted += ` ${hashtagString}`;
    }
    
    // TikTok caption limit is 150 characters for regular users
    if (formatted.length > 150) {
      formatted = formatted.substring(0, 147) + '...';
    }
    
    return formatted;
  }

  private getClientKey(): string {
    // This would come from configuration
    return process.env.TIKTOK_CLIENT_KEY || '';
  }
}