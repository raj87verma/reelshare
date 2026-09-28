import crypto from 'crypto';

export interface AuthCredentials {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  scopes: string[];
}

export interface AuthResult {
  accessToken: string;
  refreshToken?: string;
  expiresAt: Date;
  userId?: string;
  username?: string;
}

export interface VideoData {
  filePath: string;
  title: string;
  description: string;
  thumbnailPath?: string;
  tags?: string[];
  category?: string;
}

export interface PostMetadata {
  caption?: string;
  hashtags?: string[];
  location?: string;
  scheduleTime?: Date;
  isReel?: boolean;
  isStory?: boolean;
  visibility?: 'public' | 'private' | 'friends';
}

export interface UploadResult {
  success: boolean;
  postId?: string;
  url?: string;
  error?: string;
  platformData?: any;
}

export interface ScheduleResult {
  success: boolean;
  scheduledId?: string;
  scheduledTime?: Date;
  error?: string;
}

export interface AnalyticsData {
  views: number;
  likes: number;
  comments: number;
  shares: number;
  saves?: number;
  reach?: number;
  impressions?: number;
  engagementRate: number;
  collectedAt: Date;
}

export interface PlatformConfig {
  name: string;
  apiBaseUrl: string;
  authUrl: string;
  tokenUrl: string;
  uploadUrl: string;
  scopes: string[];
  maxVideoSize: number; // in bytes
  maxVideoDuration: number; // in seconds
  supportedFormats: string[];
  rateLimit: {
    requests: number;
    perSeconds: number;
  };
}

export abstract class SocialMediaPlatform {
  protected config: PlatformConfig;
  protected accessToken: string | null = null;
  protected refreshToken: string | null = null;
  protected expiresAt: Date | null = null;

  constructor(config: PlatformConfig) {
    this.config = config;
  }

  abstract authenticate(credentials: AuthCredentials): Promise<AuthResult>;
  abstract uploadVideo(video: VideoData, metadata: PostMetadata): Promise<UploadResult>;
  abstract schedulePost(video: VideoData, scheduleTime: Date): Promise<ScheduleResult>;
  abstract getAnalytics(postId: string): Promise<AnalyticsData>;
  abstract refreshAccessToken(): Promise<AuthResult>;

  protected generateState(): string {
    return crypto.randomBytes(16).toString('hex');
  }

  protected validateVideo(video: VideoData): { valid: boolean; error?: string } {
    // Check file size
    const stats = require('fs').statSync(video.filePath);
    if (stats.size > this.config.maxVideoSize) {
      return {
        valid: false,
        error: `Video exceeds maximum size of ${this.config.maxVideoSize / (1024 * 1024)}MB`
      };
    }

    // Check file extension
    const extension = video.filePath.split('.').pop()?.toLowerCase();
    if (!extension || !this.config.supportedFormats.includes(extension)) {
      return {
        valid: false,
        error: `Unsupported format. Supported formats: ${this.config.supportedFormats.join(', ')}`
      };
    }

    // Basic metadata validation
    if (!video.title || video.title.trim().length === 0) {
      return {
        valid: false,
        error: 'Video title is required'
      };
    }

    return { valid: true };
  }

  protected async makeRequest(
    url: string,
    options: RequestInit = {},
    retryOnAuthError: boolean = true
  ): Promise<any> {
    if (!this.accessToken) {
      throw new Error('Not authenticated');
    }

    const headers = {
      'Authorization': `Bearer ${this.accessToken}`,
      'Content-Type': 'application/json',
      ...options.headers
    };

    try {
      const response = await fetch(url, {
        ...options,
        headers
      });

      if (!response.ok) {
        // Handle rate limiting
        if (response.status === 429) {
          const retryAfter = response.headers.get('Retry-After');
          const waitTime = retryAfter ? parseInt(retryAfter) * 1000 : 60000;
          await new Promise(resolve => setTimeout(resolve, waitTime));
          return this.makeRequest(url, options, retryOnAuthError);
        }

        // Handle authentication errors
        if (response.status === 401 && retryOnAuthError) {
          await this.refreshAccessToken();
          return this.makeRequest(url, options, false);
        }

        const error = await response.text();
        throw new Error(`API request failed: ${response.status} ${error}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Request failed:', error);
      throw error;
    }
  }

  protected async uploadFile(
    filePath: string,
    uploadUrl: string,
    formData: Record<string, any> = {}
  ): Promise<any> {
    const fs = require('fs');
    const FormData = require('form-data');
    
    const form = new FormData();
    
    // Add file
    const fileStream = fs.createReadStream(filePath);
    form.append('video', fileStream);
    
    // Add additional form data
    Object.entries(formData).forEach(([key, value]) => {
      form.append(key, value);
    });

    const response = await fetch(uploadUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        ...form.getHeaders()
      },
      body: form
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Upload failed: ${response.status} ${error}`);
    }

    return await response.json();
  }

  setTokens(accessToken: string, refreshToken: string | null, expiresAt: Date): void {
    this.accessToken = accessToken;
    this.refreshToken = refreshToken;
    this.expiresAt = expiresAt;
  }

  isAuthenticated(): boolean {
    return !!this.accessToken && !!this.expiresAt && this.expiresAt > new Date();
  }

  getAuthUrl(credentials: AuthCredentials, state?: string): string {
    const params = new URLSearchParams({
      client_id: credentials.clientId,
      redirect_uri: credentials.redirectUri,
      response_type: 'code',
      scope: credentials.scopes.join(' '),
      state: state || this.generateState()
    });

    return `${this.config.authUrl}?${params.toString()}`;
  }

  protected calculateEngagementRate(analytics: Partial<AnalyticsData>): number {
    const { likes = 0, comments = 0, shares = 0, views = 0 } = analytics;
    
    if (views === 0) return 0;
    
    // Engagement rate formula: (likes + comments + shares) / views * 100
    return ((likes + comments + shares) / views) * 100;
  }
}