# ReelShare API Documentation

## Overview

This document provides technical documentation for extending ReelShare with new social media platforms and custom functionality.

## Architecture

### Core Components

1. **Main Process** (`electron/main.ts`): Electron main process handling window management, IPC, and service initialization
2. **Renderer Process** (`src/`): React frontend with Zustand stores
3. **Database Layer** (`electron/database.ts`): SQLite interface with encryption
4. **Platform Manager** (`electron/social-platforms/manager.ts`): Central platform registry and coordination
5. **Scheduler** (`electron/scheduler.ts`): Cron-based job scheduling
6. **Video Processor** (`electron/video-processor.ts`): FFmpeg-based video operations

## Extending Platform Support

### Platform Interface

All social media platforms must implement the `SocialMediaPlatform` interface:

```typescript
interface SocialMediaPlatform {
  name: string;
  platformId: string;
  icon: string;
  color: string;
  maxVideoSize: number;
  supportedFormats: string[];
  maxCaptionLength: number;
  
  // Authentication
  getAuthUrl(state: string): string;
  handleAuthCallback(code: string): Promise<AuthResponse>;
  refreshToken(refreshToken: string): Promise<TokenResponse>;
  
  // Post Management
  createPost(videoPath: string, metadata: PostMetadata): Promise<PostResponse>;
  uploadVideo(videoPath: string): Promise<UploadResponse>;
  getPostStatus(postId: string): Promise<PostStatus>;
  
  // Analytics
  getAccountAnalytics(accountId: string): Promise<AnalyticsData>;
  getPostAnalytics(postId: string): Promise<PostAnalytics>;
  
  // Utility Methods
  validateMetadata(metadata: PostMetadata): ValidationResult;
  getPlatformLimits(): PlatformLimits;
}
```

### Creating a New Platform

1. **Create Platform Class** (`electron/social-platforms/newplatform.ts`):

```typescript
import { SocialMediaPlatform, BasePlatform } from './base';

export class NewPlatform extends BasePlatform implements SocialMediaPlatform {
  name = 'New Platform';
  platformId = 'newplatform';
  icon = 'newplatform-icon';
  color = '#000000';
  maxVideoSize = 100 * 1024 * 1024; // 100MB
  supportedFormats = ['mp4', 'mov'];
  maxCaptionLength = 2200;
  
  constructor(config: PlatformConfig) {
    super(config);
  }
  
  async getAuthUrl(state: string): string {
    // Implement OAuth URL generation
  }
  
  async handleAuthCallback(code: string): Promise<AuthResponse> {
    // Handle OAuth callback
  }
  
  async createPost(videoPath: string, metadata: PostMetadata): Promise<PostResponse> {
    // Implement post creation
  }
}
```

2. **Register Platform** (`electron/social-platforms/manager.ts`):

```typescript
import { NewPlatform } from './newplatform';

export class SocialPlatformManager {
  // ... existing code ...
  
  registerPlatforms() {
    this.platforms.set('newplatform', new NewPlatform({
      clientId: process.env.NEWPLATFORM_CLIENT_ID,
      clientSecret: process.env.NEWPLATFORM_CLIENT_SECRET,
      redirectUri: process.env.NEWPLATFORM_REDIRECT_URI
    }));
  }
}
```

3. **Add Environment Variables** (`.env.example`):
```
NEWPLATFORM_CLIENT_ID=your_client_id
NEWPLATFORM_CLIENT_SECRET=your_client_secret
NEWPLATFORM_REDIRECT_URI=http://localhost:3000/auth/newplatform/callback
```

## Database Schema

### Tables

```sql
-- Social media accounts
CREATE TABLE social_accounts (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  platform TEXT NOT NULL,
  account_name TEXT NOT NULL,
  access_token TEXT NOT NULL,
  refresh_token TEXT,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- Videos
CREATE TABLE videos (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  file_path TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  duration_seconds INTEGER NOT NULL,
  thumbnail_path TEXT,
  metadata TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- Scheduled posts
CREATE TABLE scheduled_posts (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  video_id TEXT NOT NULL,
  scheduled_time TEXT NOT NULL,
  platforms TEXT NOT NULL, -- JSON array
  metadata TEXT NOT NULL, -- JSON object
  status TEXT NOT NULL, -- 'pending', 'processing', 'posted', 'failed'
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (video_id) REFERENCES videos(id)
);

-- Analytics
CREATE TABLE post_analytics (
  id TEXT PRIMARY KEY,
  post_id TEXT NOT NULL,
  platform TEXT NOT NULL,
  views INTEGER DEFAULT 0,
  likes INTEGER DEFAULT 0,
  comments INTEGER DEFAULT 0,
  shares INTEGER DEFAULT 0,
  engagement_rate REAL DEFAULT 0,
  collected_at TEXT NOT NULL,
  FOREIGN KEY (post_id) REFERENCES scheduled_posts(id)
);
```

## IPC Communication

### Main → Renderer Events

```typescript
// Database updates
ipcMain.on('database:update', (event, data) => {
  event.sender.send('database:updated', data);
});

// Scheduler events
ipcMain.on('scheduler:triggered', (event, jobId) => {
  event.sender.send('scheduler:job-started', jobId);
});

// Platform events
ipcMain.on('platform:auth-success', (event, account) => {
  event.sender.send('platform:connected', account);
});
```

### Renderer → Main Events

```typescript
// Video operations
ipcRenderer.send('video:upload', { path: '/path/to/video.mp4' });
ipcRenderer.send('video:process', { videoId: '123', operations: ['trim', 'thumbnail'] });

// Platform operations
ipcRenderer.send('platform:connect', { platform: 'instagram' });
ipcRenderer.send('platform:post', { 
  videoId: '123',
  platform: 'tiktok',
  metadata: { caption: 'My video' }
});

// Schedule operations
ipcRenderer.send('schedule:create', {
  videoId: '123',
  platforms: ['instagram', 'tiktok'],
  scheduledTime: '2024-01-01T12:00:00Z'
});
```

## Video Processing API

### Operations

```typescript
interface VideoOperations {
  // Basic operations
  getMetadata(videoPath: string): Promise<VideoMetadata>;
  generateThumbnail(videoPath: string, outputPath: string, timeInSeconds: number): Promise<string>;
  
  // Editing operations
  trimVideo(inputPath: string, outputPath: string, startTime: number, endTime: number): Promise<string>;
  resizeVideo(inputPath: string, outputPath: string, width: number, height: number): Promise<string>;
  compressVideo(inputPath: string, outputPath: string, targetSizeMB: number): Promise<string>;
  
  // Format conversion
  convertFormat(inputPath: string, outputPath: string, format: VideoFormat): Promise<string>;
  
  // Advanced operations
  addWatermark(videoPath: string, watermarkPath: string, outputPath: string, position: WatermarkPosition): Promise<string>;
  addSubtitles(videoPath: string, subtitlesPath: string, outputPath: string): Promise<string>;
  mergeVideos(videoPaths: string[], outputPath: string): Promise<string>;
}
```

### Example Usage

```typescript
// In renderer process
const videoProcessor = window.videoProcessor;

// Get video metadata
const metadata = await videoProcessor.getMetadata('/path/to/video.mp4');
console.log(`Duration: ${metadata.duration}s, Resolution: ${metadata.width}x${metadata.height}`);

// Generate thumbnail
const thumbnailPath = await videoProcessor.generateThumbnail(
  '/path/to/video.mp4',
  '/path/to/thumbnail.jpg',
  5 // 5 seconds into video
);

// Trim video
const trimmedPath = await videoProcessor.trimVideo(
  '/path/to/video.mp4',
  '/path/to/trimmed.mp4',
  10, // Start at 10 seconds
  30  // End at 30 seconds
);
```

## State Management (Zustand Stores)

### Store Structure

```typescript
// Example: Video Store
interface VideoStore {
  // State
  videos: Video[];
  selectedVideo: Video | null;
  isLoading: boolean;
  uploadProgress: number;
  
  // Actions
  fetchVideos: () => Promise<void>;
  uploadVideo: (file: File) => Promise<Video>;
  deleteVideo: (id: string) => Promise<void>;
  selectVideo: (video: Video | null) => void;
  updateVideoMetadata: (id: string, metadata: Partial<VideoMetadata>) => Promise<void>;
  
  // Getters
  getVideoById: (id: string) => Video | undefined;
  getRecentVideos: (limit?: number) => Video[];
}
```

### Using Stores

```typescript
// In React components
import { useVideoStore } from '@/store/video-store';

const VideoLibrary: React.FC = () => {
  const { videos, isLoading, fetchVideos, uploadVideo } = useVideoStore();
  
  useEffect(() => {
    fetchVideos();
  }, []);
  
  const handleUpload = async (file: File) => {
    try {
      await uploadVideo(file);
      toast.success('Video uploaded successfully');
    } catch (error) {
      toast.error('Upload failed');
    }
  };
  
  // ... component render
};
```

## Testing

### Unit Tests

```typescript
// Example test for platform class
describe('InstagramPlatform', () => {
  let platform: InstagramPlatform;
  
  beforeEach(() => {
    platform = new InstagramPlatform({
      clientId: 'test-client-id',
      clientSecret: 'test-client-secret',
      redirectUri: 'http://localhost:3000/auth/callback'
    });
  });
  
  test('should generate correct auth URL', () => {
    const state = 'test-state-123';
    const url = platform.getAuthUrl(state);
    
    expect(url).toContain('https://api.instagram.com/oauth/authorize');
    expect(url).toContain('client_id=test-client-id');
    expect(url).toContain(`state=${state}`);
  });
  
  test('should validate metadata correctly', () => {
    const validMetadata: PostMetadata = {
      caption: 'Test caption',
      hashtags: ['test', 'video'],
      location: 'New York'
    };
    
    const result = platform.validateMetadata(validMetadata);
    expect(result.valid).toBe(true);
  });
});
```

### Integration Tests

```typescript
describe('Video Processing Integration', () => {
  let videoProcessor: VideoProcessor;
  
  beforeAll(async () => {
    videoProcessor = new VideoProcessor();
    await videoProcessor.initialize();
  });
  
  test('should process video and generate thumbnail', async () => {
    const testVideo = '/path/to/test-video.mp4';
    const thumbnailPath = '/path/to/thumbnail.jpg';
    
    const thumbnail = await videoProcessor.generateThumbnail(
      testVideo,
      thumbnailPath,
      2
    );
    
    expect(fs.existsSync(thumbnail)).toBe(true);
    expect(thumbnail).toMatch(/\.jpg$/);
  }, 30000); // Longer timeout for video processing
});
```

## Performance Optimization

### Video Processing

1. **Web Workers**: Offload heavy video processing to worker threads
2. **Streaming**: Process videos in chunks for large files
3. **Cache**: Cache processed videos and thumbnails
4. **Parallel Processing**: Process multiple videos simultaneously when possible

### Database

1. **Indexing**: Ensure proper indexes on frequently queried columns
2. **Batch Operations**: Use transactions for multiple operations
3. **Connection Pooling**: Reuse database connections
4. **Query Optimization**: Use prepared statements and limit result sets

### Memory Management

1. **Video Buffering**: Stream videos instead of loading entire files
2. **Image Optimization**: Compress thumbnails and previews
3. **Cleanup**: Properly dispose of FFmpeg instances and file handles
4. **Monitoring**: Track memory usage and garbage collection

## Security Considerations

### Data Protection

1. **Encryption**: All sensitive data (tokens, credentials) encrypted at rest
2. **Secure Storage**: Use OS-specific secure storage when available
3. **Input Validation**: Validate all user inputs and file uploads
4. **XSS Prevention**: Sanitize user-generated content

### API Security

1. **Token Refresh**: Implement automatic token refresh before expiration
2. **Rate Limiting**: Respect platform API rate limits
3. **Error Handling**: Don't expose sensitive error details
4. **Logging**: Log security events without sensitive data

### Platform-Specific

1. **OAuth Scopes**: Request minimal required permissions
2. **Token Storage**: Store tokens securely with encryption
3. **API Keys**: Never hardcode API keys - use environment variables
4. **Updates**: Regularly update platform SDKs and APIs