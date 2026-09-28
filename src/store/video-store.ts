import { create } from 'zustand';
import { toast } from 'sonner';

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
  uploadVideo: (file: File, metadata: { title: string; description: string }) => Promise<string>;
  getVideos: () => Promise<void>;
  getVideo: (id: string) => Promise<Video | null>;
  updateVideo: (id: string, updates: Partial<Video>) => Promise<void>;
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

  // Actions
  uploadVideo: async (file, metadata) => {
    set({ uploading: true, uploadProgress: 0, error: null });
    
    try {
      // Simulate progress
      const simulateProgress = () => {
        set(state => {
          if (state.uploadProgress >= 90) return state;
          return { uploadProgress: state.uploadProgress + 10 };
        });
        
        if (get().uploadProgress < 90) {
          setTimeout(simulateProgress, 200);
        }
      };
      
      simulateProgress();
      
      // In a real app, this would send the file to Electron main process
      // For now, simulate the upload
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const videoId = `video_${Date.now()}`;
      const mockVideo: Video = {
        id: videoId,
        userId: 'user_1',
        filePath: `/videos/${file.name}`,
        title: metadata.title,
        description: metadata.description,
        durationSeconds: 60, // Would be extracted from file
        thumbnailPath: `/thumbnails/${file.name.replace(/\.[^/.]+$/, '')}.jpg`,
        metadata: {
          duration: 60,
          width: 1920,
          height: 1080,
          bitrate: 5000000,
          codec: 'h264',
          format: 'mp4',
          size: file.size,
          frameRate: 30,
          hasAudio: true
        },
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      set(state => ({
        videos: [mockVideo, ...state.videos],
        uploading: false,
        uploadProgress: 100
      }));
      
      toast.success('Video uploaded successfully');
      return videoId;
      
    } catch (error) {
      set({ 
        uploading: false, 
        uploadProgress: 0,
        error: error instanceof Error ? error.message : 'Failed to upload video'
      });
      toast.error('Failed to upload video');
      throw error;
    }
  },

  getVideos: async () => {
    set({ loading: true, error: null });
    
    try {
      // In a real app, this would fetch from the database
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Mock data for demonstration
      const mockVideos: Video[] = [
        {
          id: '1',
          userId: 'user_1',
          filePath: '/videos/summer_vlog.mp4',
          title: 'Summer Travel Vlog',
          description: 'My summer adventures in Europe',
          durationSeconds: 45,
          thumbnailPath: '/thumbnails/summer_vlog.jpg',
          metadata: {
            duration: 45,
            width: 1920,
            height: 1080,
            bitrate: 5000000,
            codec: 'h264',
            format: 'mp4',
            size: 25000000,
            frameRate: 30,
            hasAudio: true
          },
          createdAt: new Date('2024-09-20'),
          updatedAt: new Date('2024-09-20')
        },
        {
          id: '2',
          userId: 'user_1',
          filePath: '/videos/product_demo.mp4',
          title: 'Product Demo',
          description: 'Showcasing our new features',
          durationSeconds: 60,
          thumbnailPath: '/thumbnails/product_demo.jpg',
          metadata: {
            duration: 60,
            width: 1280,
            height: 720,
            bitrate: 3000000,
            codec: 'h264',
            format: 'mp4',
            size: 22000000,
            frameRate: 30,
            hasAudio: true
          },
          createdAt: new Date('2024-09-18'),
          updatedAt: new Date('2024-09-18')
        }
      ];
      
      set({ videos: mockVideos, loading: false });
      
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
      // In a real app, this would fetch from the database
      await new Promise(resolve => setTimeout(resolve, 300));
      
      const video = get().videos.find(v => v.id === id) || null;
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
      // In a real app, this would update in the database
      await new Promise(resolve => setTimeout(resolve, 300));
      
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
      // In a real app, this would delete from the database
      await new Promise(resolve => setTimeout(resolve, 300));
      
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

  processVideo: async (videoId, _options) => {
    set({ processing: true, processingProgress: 0, error: null });
    
    try {
      const video = get().videos.find(v => v.id === videoId);
      if (!video) throw new Error('Video not found');
      
      // Simulate processing progress
      const simulateProcessing = () => {
        set(state => {
          if (state.processingProgress >= 90) return state;
          return { processingProgress: state.processingProgress + 10 };
        });
        
        if (get().processingProgress < 90) {
          setTimeout(simulateProcessing, 300);
        }
      };
      
      simulateProcessing();
      
      // In a real app, this would call the video processor service
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      const processedVideoId = `processed_${Date.now()}`;
      
      set({
        processing: false,
        processingProgress: 100
      });
      
      toast.success('Video processed successfully');
      return processedVideoId;
      
    } catch (error) {
      set({ 
        processing: false, 
        processingProgress: 0,
        error: error instanceof Error ? error.message : 'Failed to process video'
      });
      toast.error('Failed to process video');
      throw error;
    }
  },

  generateThumbnail: async (_videoPath, _timestamp = 5) => {
    try {
      // In a real app, this would call the video processor service
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      return `/thumbnails/generated_${Date.now()}.jpg`;
      
    } catch (error) {
      throw new Error('Failed to generate thumbnail');
    }
  },

  compressVideo: async (_inputPath, outputPath, _quality) => {
    try {
      // In a real app, this would call the video processor service
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      return outputPath;
      
    } catch (error) {
      throw new Error('Failed to compress video');
    }
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