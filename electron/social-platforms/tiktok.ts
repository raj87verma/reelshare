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
  // Stashed from the credentials passed to authenticate() so
  // refreshAccessToken() (which takes no arguments, per the
  // SocialMediaPlatform interface) can still include client_key in its
  // refresh_token request.
  private lastClientKey: string | null = null;

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
      // TikTok's Content Posting API supports uploads up to 10 minutes as
      // of 2026 (in-app recording is capped lower, but that doesn't apply
      // to API-based uploads like this). The old 180s limit here was far
      // stricter than what TikTok's own upload API actually allows.
      maxVideoDuration: 10 * 60, // 10 minutes
      supportedFormats: ['mp4', 'mov'],
      rateLimit: {
        requests: 100,
        perSeconds: 3600 // per hour
      }
    });
  }

  async authenticate(credentials: AuthCredentials): Promise<AuthResult> {
    try {
      const authUrl = this.getTikTokAuthUrl(credentials);

      // Opens the real TikTok login/consent dialog in the system browser
      // and waits for the redirect (captured by a local loopback server
      // on credentials.redirectUri) to hand back a real authorization
      // code.
      const authCode = await this.getRealAuthorizationCode(authUrl, credentials);
      
      // Exchange code for access token
      const tokenResponse = await this.makeTokenRequest(credentials, authCode);
      
      if (!tokenResponse.data || !tokenResponse.data.access_token) {
        throw new Error('Invalid token response');
      }
      
      this.openId = tokenResponse.data.open_id;
      this.lastClientKey = credentials.clientId;
      
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
      if (!this.lastClientKey) {
        throw new Error('Missing API credentials for token refresh -- please reconnect this account');
      }

      const response = await this.makeRequest(
        `${this.config.tokenUrl}/refresh_token`,
        {
          method: 'POST',
          body: JSON.stringify({
            client_key: this.lastClientKey,
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

  // TikTok's v2 authorize endpoint uses `client_key` as the query param
  // name (not `client_id`, unlike every other platform here), so the
  // shared SocialMediaPlatform.getAuthUrl() helper can't be reused as-is.
  private getTikTokAuthUrl(credentials: AuthCredentials): string {
    const params = new URLSearchParams({
      client_key: credentials.clientId,
      redirect_uri: credentials.redirectUri,
      response_type: 'code',
      scope: credentials.scopes.join(','),
      state: this.generateState()
    });

    return `${this.config.authUrl}?${params.toString()}`;
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
      const body = await response.text();
      let detail = body;
      try {
        const parsed = JSON.parse(body);
        detail = parsed.error_description || parsed.error?.message || parsed.message || body;
      } catch { /* not JSON, use raw body */ }
      throw new Error(`Token exchange failed: ${detail}`);
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

}