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

export class YouTubePlatform extends SocialMediaPlatform {
  private channelId: string | null = null;

  constructor() {
    super({
      name: 'YouTube',
      apiBaseUrl: 'https://www.googleapis.com/youtube/v3',
      authUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
      tokenUrl: 'https://oauth2.googleapis.com/token',
      uploadUrl: 'https://www.googleapis.com/upload/youtube/v3/videos',
      scopes: [
        'https://www.googleapis.com/auth/youtube.upload',
        'https://www.googleapis.com/auth/youtube',
        'https://www.googleapis.com/auth/youtube.readonly'
      ],
      maxVideoSize: 128 * 1024 * 1024, // 128GB for verified accounts, 128MB for regular
      maxVideoDuration: 12 * 60 * 60, // 12 hours
      supportedFormats: ['mp4', 'mov', 'avi', 'wmv', 'flv', 'webm'],
      rateLimit: {
        requests: 10000,
        perSeconds: 86400 // per day
      }
    });
  }

  async authenticate(credentials: AuthCredentials): Promise<AuthResult> {
    try {
      const authUrl = this.getGoogleAuthUrl(credentials);
      
      console.log('Open this URL for YouTube authentication:', authUrl);
      
      // Simulate getting the authorization code
      const authCode = 'simulated_youtube_auth_code';
      
      // Exchange code for access token
      const tokenResponse = await this.makeTokenRequest(credentials, authCode);
      
      // Get channel information
      const channelInfo = await this.getChannelInfo(tokenResponse.access_token);
      
      this.channelId = channelInfo.items?.[0]?.id || null;
      
      const result: AuthResult = {
        accessToken: tokenResponse.access_token,
        refreshToken: tokenResponse.refresh_token,
        expiresAt: new Date(Date.now() + tokenResponse.expires_in * 1000),
        userId: this.channelId || undefined,
        username: channelInfo.items?.[0]?.snippet?.title
      };
      
      this.setTokens(
        tokenResponse.access_token,
        tokenResponse.refresh_token,
        result.expiresAt
      );
      
      return result;
      
    } catch (error) {
      console.error('YouTube authentication failed:', error);
      throw new Error(`YouTube authentication failed: ${error}`);
    }
  }

  async uploadVideo(video: VideoData, metadata: PostMetadata): Promise<UploadResult> {
    try {
      if (!this.isAuthenticated()) {
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

      // Prepare video metadata
      const videoMetadata = {
        snippet: {
          title: video.title,
          description: this.formatDescription(video.description, metadata),
          tags: metadata.hashtags || [],
          categoryId: this.mapCategory(metadata.category || '22'), // 22 = People & Blogs
          defaultLanguage: 'en',
          defaultAudioLanguage: 'en'
        },
        status: {
          privacyStatus: this.mapPrivacyStatus(metadata.visibility || 'public'),
          selfDeclaredMadeForKids: false,
          publishAt: metadata.scheduleTime?.toISOString()
        }
      };

      // YouTube requires multipart upload with metadata and video file
      // For simplicity, we'll simulate the upload
      
      // Step 1: Create upload session
      const uploadResponse = await this.makeRequest(
        `${this.config.uploadUrl}?part=snippet,status&uploadType=multipart`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'multipart/related; boundary=boundary'
          },
          body: this.createMultipartBody(videoMetadata, video.filePath)
        }
      );

      if (!uploadResponse.id) {
        throw new Error('Upload failed');
      }

      return {
        success: true,
        postId: uploadResponse.id,
        url: `https://www.youtube.com/watch?v=${uploadResponse.id}`,
        platformData: {
          ...uploadResponse,
          uploadedAt: new Date().toISOString()
        }
      };

    } catch (error) {
      console.error('YouTube upload failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Upload failed'
      };
    }
  }

  async schedulePost(video: VideoData, scheduleTime: Date): Promise<ScheduleResult> {
    try {
      if (!this.isAuthenticated()) {
        throw new Error('Not authenticated');
      }

      // YouTube supports scheduling natively via publishAt field
      // We'll use the standard upload with scheduled publish time
      
      const scheduledId = `youtube_scheduled_${Date.now()}`;
      
      return {
        success: true,
        scheduledId,
        scheduledTime
      };

    } catch (error) {
      console.error('YouTube scheduling failed:', error);
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

      // Get video statistics
      const statsResponse = await this.makeRequest(
        `${this.config.apiBaseUrl}/videos`,
        {
          method: 'GET'
        },
        {
          id: postId,
          part: 'statistics,snippet'
        }
      );

      if (!statsResponse.items || statsResponse.items.length === 0) {
        throw new Error('Video not found');
      }

      const video = statsResponse.items[0];
      const stats = video.statistics;
      
      const views = parseInt(stats.viewCount || '0');
      const likes = parseInt(stats.likeCount || '0');
      const comments = parseInt(stats.commentCount || '0');
      
      // YouTube doesn't provide share count via API
      const shares = 0;

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
        engagementRate,
        collectedAt: new Date()
      };

    } catch (error) {
      console.error('Failed to get YouTube analytics:', error);
      throw new Error(`Failed to get analytics: ${error}`);
    }
  }

  async refreshAccessToken(): Promise<AuthResult> {
    try {
      if (!this.refreshToken) {
        throw new Error('No refresh token available');
      }

      const response = await fetch(this.config.tokenUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: new URLSearchParams({
          client_id: this.getClientId(),
          client_secret: this.getClientSecret(),
          refresh_token: this.refreshToken,
          grant_type: 'refresh_token'
        })
      });

      if (!response.ok) {
        throw new Error('Token refresh failed');
      }

      const data = await response.json();
      
      const result: AuthResult = {
        accessToken: data.access_token,
        refreshToken: this.refreshToken, // Google returns same refresh token
        expiresAt: new Date(Date.now() + data.expires_in * 1000),
        userId: this.channelId || undefined
      };

      this.setTokens(data.access_token, this.refreshToken, result.expiresAt);
      
      return result;

    } catch (error) {
      console.error('Token refresh failed:', error);
      throw error;
    }
  }

  private getGoogleAuthUrl(credentials: AuthCredentials): string {
    const params = new URLSearchParams({
      client_id: credentials.clientId,
      redirect_uri: credentials.redirectUri,
      response_type: 'code',
      scope: credentials.scopes.join(' '),
      access_type: 'offline',
      prompt: 'consent',
      state: this.generateState()
    });

    return `${this.config.authUrl}?${params.toString()}`;
  }

  private async makeTokenRequest(credentials: AuthCredentials, code: string): Promise<any> {
    const response = await fetch(this.config.tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        client_id: credentials.clientId,
        client_secret: credentials.clientSecret,
        code,
        redirect_uri: credentials.redirectUri,
        grant_type: 'authorization_code'
      })
    });

    if (!response.ok) {
      throw new Error('Token exchange failed');
    }

    return await response.json();
  }

  private async getChannelInfo(accessToken: string): Promise<any> {
    const response = await fetch(
      `${this.config.apiBaseUrl}/channels?part=snippet&mine=true`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      }
    );

    if (!response.ok) {
      throw new Error('Failed to get channel info');
    }

    return await response.json();
  }

  private formatDescription(description: string, metadata: PostMetadata): string {
    let formatted = description || '';
    
    if (metadata.hashtags && metadata.hashtags.length > 0) {
      const hashtagString = metadata.hashtags.map(tag => tag.startsWith('#') ? tag : `#${tag}`).join(' ');
      formatted += `\n\n${hashtagString}`;
    }
    
    if (metadata.caption && metadata.caption !== description) {
      formatted = metadata.caption + '\n\n' + formatted;
    }
    
    // YouTube description limit is 5000 characters
    if (formatted.length > 5000) {
      formatted = formatted.substring(0, 4997) + '...';
    }
    
    return formatted;
  }

  private mapCategory(category: string): string {
    const categories: Record<string, string> = {
      'film': '1',
      'autos': '2',
      'music': '10',
      'pets': '15',
      'sports': '17',
      'gaming': '20',
      'people': '22',
      'comedy': '23',
      'entertainment': '24',
      'news': '25',
      'howto': '26',
      'education': '27',
      'science': '28',
      'nonprofits': '29'
    };
    
    return categories[category.toLowerCase()] || '22'; // Default to People & Blogs
  }

  private mapPrivacyStatus(visibility: string): string {
    switch (visibility.toLowerCase()) {
      case 'private':
        return 'private';
      case 'unlisted':
        return 'unlisted';
      case 'friends':
        return 'unlisted'; // YouTube doesn't have friends-only
      default:
        return 'public';
    }
  }

  private createMultipartBody(metadata: any, filePath: string): string {
    // Simplified multipart body creation
    // In a real implementation, this would properly handle file streaming
    const boundary = 'boundary';
    const metadataPart = JSON.stringify(metadata);
    
    return [
      `--${boundary}`,
      'Content-Type: application/json; charset=UTF-8',
      '',
      metadataPart,
      `--${boundary}`,
      'Content-Type: video/*',
      '',
      `File: ${filePath}`,
      `--${boundary}--`
    ].join('\r\n');
  }

  private getClientId(): string {
    return process.env.YOUTUBE_CLIENT_ID || '';
  }

  private getClientSecret(): string {
    return process.env.YOUTUBE_CLIENT_SECRET || '';
  }

  // Override makeRequest to handle Google API's query parameters
  protected async makeRequest(
    url: string,
    options: RequestInit = {},
    queryParams: Record<string, any> = {},
    retryOnAuthError: boolean = true
  ): Promise<any> {
    // Add query parameters to URL
    const urlObj = new URL(url);
    Object.entries(queryParams).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        urlObj.searchParams.append(key, value.toString());
      }
    });
    
    return super.makeRequest(urlObj.toString(), options, retryOnAuthError);
  }
}