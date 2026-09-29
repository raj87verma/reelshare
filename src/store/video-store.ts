import { create } from 'zustand';
import { toast } from 'sonner';
import { useAppStore } from './app-store';

export interface VideoMetadata {
  duration: number;
  width: number;
  height: number;
  bitrate: number;
  codec: string;
  format: string;
  size: number;
  frameRate: number;
  hasAudio: boolean;
}

export interface Video {
  id: string;
  userId: string;
  filePath: string;
  title: string;
  description: string;
  durationSeconds: number;
  thumbnailPath: string;
  metadata: VideoMetadata;
  createdAt: Date;
  updatedAt: Date;
}

export interface ProcessingOptions {
  trimStart?: number;
  trimEnd?: number;
  targetFormat?: 'mp4' | 'webm' | 'mov';
  targetResolution?: '1080p' | '720p' | '480p';
  quality?: number;
  addWatermark?: boolean;
  addCaption?: string;
}

// A raw row as returned by the main process's SQLite layer
// (electron/database.ts's Video interface -- snake_case columns, JSON
// metadata stored as a string).
interface RawVideoRow {
  id: string;
  user_id: string;
  file_path: string;
  title: string;
  description: string;
  duration_seconds: number;
  thumbnail_path: string;
  metadata: string;
  created_at: string;
  updated_at: string;
}

function rowToVideo(row: RawVideoRow): Video {
  let metadata: VideoMetadata;
  try {
    metadata = JSON.parse(row.metadata);
  } catch {
    metadata = {
      duration: row.duration_seconds,
      width: 0,
      height: 0,
      bitrate: 0,
      codec: 'unknown',
      format: 'mp4',
      size: 0,
      frameRate: 0,
      hasAudio: false
    };
  }

  return {
    id: row.id,
    userId: row.user_id,
    filePath: row.file_path,
    title: row.title,
    description: row.description || '',
    durationSeconds: row.duration_seconds,
    // Thumbnails are stored on disk as absolute filesystem paths; the
    // renderer needs the file:// protocol prefix to actually load them
    // as an <img>/background-image source.
    thumbnailPath: row.thumbnail_path ? toFileUrl(row.thumbnail_path) : '',
    metadata,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at)
  };
}

function toFileUrl(absolutePath: string): string {
  if (!absolutePath) return '';
  if (absolutePath.startsWith('file://')) return absolutePath;
  // Windows paths use backslashes and drive letters (C:\...); the file://
  // URL form needs forward slashes and a leading slash before the drive
  // letter (file:///C:/Users/...).
  const normalized = absolutePath.replace(/\\/g, '/');
  const prefixed = normalized.startsWith('/') ? normalized : `/${normalized}`;
  return `file://${prefixed}`;
}

function getCurrentUserId(): string | null {
  return useAppStore.getState().user?.id || null;
}

interface VideoState {
  // Videos
  videos: Video[];
  currentVideo: Video | null;
  loading: boolean;
  error: string | null;
  
  // Upload state
  uploading: boolean;
  uploadProgress: number;
  
  // Processing state
  processing: boolean;
  processingProgress: number;
  
  // Actions
  pickAndUploadVideo: (metadataOverrides?: { title?: string; description?: string }) => Promise<string | null>;
  getVideos: () => Promise<void>;
  getVideo: (id: string) => Promise<Video | null>;
  updateVideo: (id: string, updates: Partial<Pick<Video, 'title' | 'description'>>) => Promise<void>;
  deleteVideo: (id: string) => Promise<void>;
  
  // Video processing
  processVideo: (videoId: string, options: ProcessingOptions) => Promise<string>;
  generateThumbnail: (videoPath: string, timestamp?: number) => Promise<string>;
  compressVideo: (inputPath: string, outputPath: string, quality: number) => Promise<string>;
  
  // Utility
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  clearError: () => void;
}

export const useVideoStore = create<VideoState>((set, get) => ({
  // Initial state
  videos: [],
  currentVideo: null,
  loading: false,
  error: null,
  uploading: false,
  uploadProgress: 0,
  processing: false,
  processingProgress: 0,

  // Opens the native file picker, copies the chosen video into ReelShare's
  // permanent storage, extracts real metadata via ffprobe, generates a
  // thumbnail, and persists a row in SQLite via IPC. Returns the new
  // video's id, or null if the user cancelled the picker.
  //
  // This replaces the previous implementation, which only pushed a fake
  // Video object into an in-memory array -- nothing was ever written to
  // disk or to the database, so every "uploaded" video vanished the
  // moment the renderer state was cleared (e.g. navigating away and back,
  // or restarting the app), which is exactly the "videos disappear from
  // the library" bug this was rewritten to fix.
  pickAndUploadVideo: async (metadataOverrides) => {
    const userId = getCurrentUserId();
    if (!userId) {
      toast.error('You must be logged in to upload videos');
      return null;
    }

    if (!window.electronAPI?.videos) {
      toast.error('Video upload is not available in this environment');
      return null;
    }

    set({ uploading: true, uploadProgress: 5, error: null });

    try {
      const sourcePath = await window.electronAPI.videos.pickFile();
      if (!sourcePath) {
        // User cancelled the picker -- not an error.
        set({ uploading: false, uploadProgress: 0 });
        return null;
      }

      set({ uploadProgress: 20 });
      const fileName = sourcePath.split(/[\\/]/).pop() || 'video.mp4';
      const savedPath = await window.electronAPI.videos.saveFile(sourcePath, fileName);

      set({ uploadProgress: 45 });
      const metadata = await window.electronAPI.videos.getMetadata(savedPath);

      // Enforce the user's configured maximum duration (Settings > Video >
      // Maximum Video Duration). This is ReelShare's own local limit, on
      // top of (and generally more permissive than) whatever cap the
      // destination platform enforces at actual publish time.
      const maxDurationSeconds: number = (await window.electronAPI.config.get('video.maxDurationSeconds')) ?? 30 * 60;
      if (metadata?.duration && metadata.duration > maxDurationSeconds) {
        // The file was already copied into permanent storage above; since
        // we're rejecting it before creating a database row, remove that
        // copy directly rather than leaving an orphaned file behind (no
        // DB row exists yet for deleteVideo()'s file-cleanup logic to
        // reach it).
        try {
          await window.electronAPI.deleteFile(savedPath);
        } catch (cleanupError) {
          console.error('Failed to clean up rejected video file:', cleanupError);
        }
        const maxMinutes = Math.round(maxDurationSeconds / 60);
        const actualMinutes = Math.round(metadata.duration / 60);
        throw new Error(
          `Video is too long (${actualMinutes} min). The maximum allowed is ${maxMinutes} min -- change this in Settings > Video if needed.`
        );
      }

      set({ uploadProgress: 70 });
      let thumbnailPath = '';
      try {
        thumbnailPath = await window.electronAPI.videos.generateThumbnail(savedPath, Math.min(5, metadata?.duration || 5));
      } catch (thumbError) {
        console.error('Thumbnail generation failed (continuing without one):', thumbError);
      }

      set({ uploadProgress: 90 });

      const defaultTitle = fileName.replace(/\.[^/.]+$/, '');
      const videoId: string = await window.electronAPI.videos.create({
        user_id: userId,
        file_path: savedPath,
        title: metadataOverrides?.title || defaultTitle,
        description: metadataOverrides?.description || '',
        duration_seconds: Math.round(metadata?.duration || 0),
        thumbnail_path: thumbnailPath,
        metadata: JSON.stringify(metadata || {})
      });

      set({ uploading: false, uploadProgress: 100 });
      toast.success('Video uploaded successfully');

      // Refresh the list so the new video shows up immediately.
      await get().getVideos();

      return videoId;

    } catch (error) {
      set({
        uploading: false,
        uploadProgress: 0,
        error: error instanceof Error ? error.message : 'Failed to upload video'
      });
      toast.error(error instanceof Error ? error.message : 'Failed to upload video');
      return null;
    }
  },

  getVideos: async () => {
    const userId = getCurrentUserId();
    if (!userId) {
      set({ videos: [], loading: false });
      return;
    }

    set({ loading: true, error: null });

    try {
      if (!window.electronAPI?.videos) {
        set({ videos: [], loading: false });
        return;
      }

      const rows = (await window.electronAPI.videos.getAll(userId)) as RawVideoRow[];
      const videos = rows.map(rowToVideo);

      set({ videos, loading: false });

    } catch (error) {
      set({ 
        loading: false,
        error: error instanceof Error ? error.message : 'Failed to load videos'
      });
      toast.error('Failed to load videos');
    }
  },

  getVideo: async (id) => {
    set({ loading: true, error: null });
    
    try {
      // Prefer the already-loaded list (avoids an extra IPC round trip and
      // keeps thumbnailPath's file:// conversion consistent), falling back
      // to a direct fetch if it's not loaded yet.
      const cached = get().videos.find(v => v.id === id);
      if (cached) {
        set({ currentVideo: cached, loading: false });
        return cached;
      }

      if (!window.electronAPI?.videos) {
        set({ loading: false });
        return null;
      }

      const row = (await window.electronAPI.videos.get(id)) as RawVideoRow | null;
      const video = row ? rowToVideo(row) : null;
      set({ currentVideo: video, loading: false });
      
      return video;
      
    } catch (error) {
      set({ 
        loading: false,
        error: error instanceof Error ? error.message : 'Failed to load video'
      });
      toast.error('Failed to load video');
      return null;
    }
  },

  updateVideo: async (id, updates) => {
    set({ loading: true, error: null });
    
    try {
      if (!window.electronAPI?.videos) {
        throw new Error('Video storage is not available in this environment');
      }

      await window.electronAPI.videos.update(id, updates);
      
      set(state => ({
        videos: state.videos.map(video =>
          video.id === id
            ? { ...video, ...updates, updatedAt: new Date() }
            : video
        ),
        currentVideo: state.currentVideo?.id === id
          ? { ...state.currentVideo, ...updates, updatedAt: new Date() }
          : state.currentVideo,
        loading: false
      }));
      
      toast.success('Video updated successfully');
      
    } catch (error) {
      set({ 
        loading: false,
        error: error instanceof Error ? error.message : 'Failed to update video'
      });
      toast.error('Failed to update video');
    }
  },

  deleteVideo: async (id) => {
    set({ loading: true, error: null });
    
    try {
      if (!window.electronAPI?.videos) {
        throw new Error('Video storage is not available in this environment');
      }

      await window.electronAPI.videos.delete(id);
      
      set(state => ({
        videos: state.videos.filter(video => video.id !== id),
        currentVideo: state.currentVideo?.id === id ? null : state.currentVideo,
        loading: false
      }));
      
      toast.success('Video deleted successfully');
      
    } catch (error) {
      set({ 
        loading: false,
        error: error instanceof Error ? error.message : 'Failed to delete video'
      });
      toast.error('Failed to delete video');
    }
  },

  // Note: trim/compress/watermark editing (as opposed to upload + basic
  // metadata/thumbnail extraction, which is fully wired) is not yet
  // exposed through the UI. electron/video-processor.ts's processVideo()
  // exists and works on the main-process side, but no IPC channel or
  // preload bridge method calls it yet from the Video Library UI, so this
  // deliberately throws a clear error rather than silently no-op-ing or
  // pretending to succeed.
  processVideo: async (_videoId, _options) => {
    throw new Error('Video editing (trim/compress/watermark) is not yet available from the UI');
  },

  generateThumbnail: async (videoPath, timestamp = 5) => {
    if (!window.electronAPI?.videos) {
      throw new Error('Video processing is not available in this environment');
    }
    return await window.electronAPI.videos.generateThumbnail(videoPath, timestamp);
  },

  compressVideo: async (_inputPath, _outputPath, _quality) => {
    throw new Error('Video compression is not yet available from the UI');
  },

  setLoading: (loading) => set({ loading }),
  
  setError: (error) => set({ error }),
  
  clearError: () => set({ error: null })
}));

// Helper function to format video duration
export const formatDuration = (seconds: number): string => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  
  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${minutes}:${secs.toString().padStart(2, '0')}`;
};

// Helper function to format file size
export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};
