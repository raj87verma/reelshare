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

export class InstagramPlatform extends SocialMediaPlatform {
  private pageId: string | null = null;
  private instagramAccountId: string | null = null;

  constructor() {
    super({
      name: 'Instagram',
      apiBaseUrl: 'https://graph.facebook.com/v18.0',
      authUrl: 'https://www.facebook.com/v18.0/dialog/oauth',
      tokenUrl: 'https://graph.facebook.com/v18.0/oauth/access_token',
      uploadUrl: 'https://graph.facebook.com/v18.0/{ig_user_id}/media',
      scopes: [
        'instagram_basic',
        'instagram_content_publish',
        'pages_show_list',
        'pages_read_engagement'
      ],
      maxVideoSize: 100 * 1024 * 1024, // 100MB
      maxVideoDuration: 90, // 90 seconds for reels
      supportedFormats: ['mp4', 'mov'],
      rateLimit: {
        requests: 200,
        perSeconds: 3600 // per hour
      }
    });
  }

  async authenticate(credentials: AuthCredentials): Promise<AuthResult> {
    try {
      // For Instagram, we need to get a Facebook Page access token first
      const authUrl = this.getAuthUrl(credentials);
      
      // In a real implementation, this would open a browser window for OAuth
      // For now, we'll simulate the flow
      console.log('Open this URL for authentication:', authUrl);
      
      // Simulate getting the authorization code
      const authCode = 'simulated_auth_code';
      
      // Exchange code for access token
      const tokenResponse = await this.makeTokenRequest(credentials, authCode);
      
      // Get user's pages to find the Instagram account
      const pages = await this.getUserPages(tokenResponse.access_token);
      
      if (pages.length === 0) {
        throw new Error('No Facebook pages found. Please connect a Facebook Page to your Instagram account.');
      }
      
      // For simplicity, use the first page
      const page = pages[0];
      this.pageId = page.id;
      
      // Get Instagram business account ID
      const igAccount = await this.getInstagramAccount(page.id, tokenResponse.access_token);
      this.instagramAccountId = igAccount.instagram_business_account?.id;
      
      if (!this.instagramAccountId) {
        throw new Error('No Instagram business account found connected to this Facebook page.');
      }
      
      // Get long-lived access token
      const longLivedToken = await this.getLongLivedToken(
        tokenResponse.access_token,
        credentials.clientSecret
      );
      
      // Get page access token
      const pageToken = await this.getPageAccessToken(page.id, longLivedToken);
      
      const result: AuthResult = {
        accessToken: pageToken,
        refreshToken: longLivedToken,
        expiresAt: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000), // 60 days
        userId: this.instagramAccountId,
        username: page.name
      };
      
      this.setTokens(pageToken, longLivedToken, result.expiresAt);
      
      return result;
      
    } catch (error) {
      console.error('Instagram authentication failed:', error);
      throw new Error(`Instagram authentication failed: ${error}`);
    }
  }

  async uploadVideo(video: VideoData, metadata: PostMetadata): Promise<UploadResult> {
    try {
      if (!this.isAuthenticated() || !this.instagramAccountId) {
        throw new Error('Not authenticated or Instagram account not connected');
      }

      // Validate video
      const validation = this.validateVideo(video);
      if (!validation.valid) {
        return {
          success: false,
          error: validation.error
        };
      }

      // Check if video is a reel
      const isReel = metadata.isReel || video.filePath.includes('reel') || 
                    (video.title.toLowerCase().includes('reel') && 
                     this.config.maxVideoDuration <= 90);

      // Step 1: Create media container
      const containerResponse = await this.makeRequest(
        `${this.config.apiBaseUrl}/${this.instagramAccountId}/media`,
        {
          method: 'POST',
          body: JSON.stringify({
            media_type: 'REELS' + (isReel ? '' : '_VIDEO'),
            video_url: this.getTemporaryUploadUrl(video.filePath), // In real app, upload to Facebook's servers first
            caption: this.formatCaption(metadata.caption || video.description, metadata.hashtags),
            share_to_feed: !isReel, // Share to feed if not a reel
            location_id: metadata.location,
            thumb_offset: 1000 // 1 second thumbnail
          })
        }
      );

      if (!containerResponse.id) {
        throw new Error('Failed to create media container');
      }

      const containerId = containerResponse.id;

      // Step 2: Publish the media
      const publishResponse = await this.makeRequest(
        `${this.config.apiBaseUrl}/${this.instagramAccountId}/media_publish`,
        {
          method: 'POST',
          body: JSON.stringify({
            creation_id: containerId
          })
        }
      );

      if (!publishResponse.id) {
        throw new Error('Failed to publish media');
      }

      return {
        success: true,
        postId: publishResponse.id,
        url: `https://www.instagram.com/p/${publishResponse.id}/`,
        platformData: {
          containerId,
          isReel,
          publishedAt: new Date().toISOString()
        }
      };

    } catch (error) {
      console.error('Instagram upload failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Upload failed'
      };
    }
  }

  async schedulePost(video: VideoData, scheduleTime: Date): Promise<ScheduleResult> {
    try {
      if (!this.isAuthenticated() || !this.instagramAccountId) {
        throw new Error('Not authenticated or Instagram account not connected');
      }

      // Instagram API doesn't support direct scheduling via API for regular accounts
      // For business accounts, we can use Facebook's scheduling
      
      // For now, we'll simulate scheduling by storing the post details
      // In a real implementation, this would:
      // 1. Upload video to temporary storage
      // 2. Create a scheduled post in Facebook's system
      
      const scheduledId = `instagram_scheduled_${Date.now()}`;
      
      return {
        success: true,
        scheduledId,
        scheduledTime: scheduleTime
      };

    } catch (error) {
      console.error('Instagram scheduling failed:', error);
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

      // Get insights for the post
      const insightsResponse = await this.makeRequest(
        `${this.config.apiBaseUrl}/${postId}/insights`,
        {
          method: 'GET'
        }
      );

      const insights = insightsResponse.data || [];
      
      // Extract metrics
      let views = 0;
      let likes = 0;
      let comments = 0;
      let shares = 0;
      let reach = 0;
      let impressions = 0;

      insights.forEach((insight: any) => {
        switch (insight.name) {
          case 'video_views':
            views = insight.values?.[0]?.value || 0;
            break;
          case 'likes':
            likes = insight.values?.[0]?.value || 0;
            break;
          case 'comments':
            comments = insight.values?.[0]?.value || 0;
            break;
          case 'shares':
            shares = insight.values?.[0]?.value || 0;
            break;
          case 'reach':
            reach = insight.values?.[0]?.value || 0;
            break;
          case 'impressions':
            impressions = insight.values?.[0]?.value || 0;
            break;
        }
      });

      const engagementRate = this.calculateEngagementRate({
        likes,
        comments,
        shares,
        views: views || reach || impressions
      });

      return {
        views,
        likes,
        comments,
        shares,
        reach,
        impressions,
        engagementRate,
        collectedAt: new Date()
      };

    } catch (error) {
      console.error('Failed to get Instagram analytics:', error);
      throw new Error(`Failed to get analytics: ${error}`);
    }
  }

  async refreshAccessToken(): Promise<AuthResult> {
    try {
      if (!this.refreshToken) {
        throw new Error('No refresh token available');
      }

      // Instagram uses Facebook's token refresh system
      const response = await fetch(
        `${this.config.apiBaseUrl}/oauth/access_token?` +
        `grant_type=fb_exchange_token&` +
        `client_id=${this.getClientId()}&` +
        `client_secret=${this.getClientSecret()}&` +
        `fb_exchange_token=${this.refreshToken}`,
        {
          method: 'GET'
        }
      );

      if (!response.ok) {
        throw new Error('Token refresh failed');
      }

      const data = await response.json() as { access_token: string; expires_in?: number };
      
      const result: AuthResult = {
        accessToken: data.access_token,
        refreshToken: data.access_token, // Facebook returns same token for long-lived
        expiresAt: new Date(Date.now() + (data.expires_in || 5184000) * 1000), // Default 60 days
        userId: this.instagramAccountId || undefined
      };

      this.setTokens(data.access_token, data.access_token, result.expiresAt);
      
      return result;

    } catch (error) {
      console.error('Token refresh failed:', error);
      throw error;
    }
  }

  private async makeTokenRequest(credentials: AuthCredentials, code: string): Promise<any> {
    const response = await fetch(
      `${this.config.tokenUrl}?` +
      `client_id=${credentials.clientId}&` +
      `client_secret=${credentials.clientSecret}&` +
      `redirect_uri=${encodeURIComponent(credentials.redirectUri)}&` +
      `code=${code}`,
      {
        method: 'GET'
      }
    );

    if (!response.ok) {
      throw new Error('Token exchange failed');
    }

    return (await response.json()) as Record<string, any>;
  }

  private async getUserPages(accessToken: string): Promise<any[]> {
    const response = await fetch(
      `${this.config.apiBaseUrl}/me/accounts?access_token=${accessToken}`,
      {
        method: 'GET'
      }
    );

    if (!response.ok) {
      throw new Error('Failed to get user pages');
    }

    const data = await response.json() as { data?: any[] };
    return data.data || [];
  }

  private async getInstagramAccount(pageId: string, accessToken: string): Promise<any> {
    const response = await fetch(
      `${this.config.apiBaseUrl}/${pageId}?` +
      `fields=instagram_business_account&` +
      `access_token=${accessToken}`,
      {
        method: 'GET'
      }
    );

    if (!response.ok) {
      throw new Error('Failed to get Instagram account');
    }

    return (await response.json()) as Record<string, any>;
  }

  private async getLongLivedToken(shortLivedToken: string, clientSecret: string): Promise<string> {
    const response = await fetch(
      `${this.config.apiBaseUrl}/oauth/access_token?` +
      `grant_type=fb_exchange_token&` +
      `client_id=${this.getClientId()}&` +
      `client_secret=${clientSecret}&` +
      `fb_exchange_token=${shortLivedToken}`,
      {
        method: 'GET'
      }
    );

    if (!response.ok) {
      throw new Error('Failed to get long-lived token');
    }

    const data = await response.json() as { access_token: string };
    return data.access_token;
  }

  private async getPageAccessToken(pageId: string, userAccessToken: string): Promise<string> {
    const response = await fetch(
      `${this.config.apiBaseUrl}/${pageId}?` +
      `fields=access_token&` +
      `access_token=${userAccessToken}`,
      {
        method: 'GET'
      }
    );

    if (!response.ok) {
      throw new Error('Failed to get page access token');
    }

    const data = await response.json() as { access_token: string };
    return data.access_token;
  }

  private getTemporaryUploadUrl(filePath: string): string {
    // In a real implementation, this would:
    // 1. Upload the file to Facebook's temporary storage
    // 2. Return the URL for the Instagram API
    // For now, return a placeholder
    return `https://example.com/temp-upload/${Date.now()}`;
  }

  private formatCaption(caption: string, hashtags?: string[]): string {
    let formatted = caption || '';
    
    if (hashtags && hashtags.length > 0) {
      const hashtagString = hashtags.map(tag => tag.startsWith('#') ? tag : `#${tag}`).join(' ');
      formatted += `\n\n${hashtagString}`;
    }
    
    // Instagram caption limit is 2200 characters
    if (formatted.length > 2200) {
      formatted = formatted.substring(0, 2197) + '...';
    }
    
    return formatted;
  }

  private getClientId(): string {
    // This would come from configuration
    return process.env.INSTAGRAM_CLIENT_ID || '';
  }

  private getClientSecret(): string {
    // This would come from configuration
    return process.env.INSTAGRAM_CLIENT_SECRET || '';
  }
}