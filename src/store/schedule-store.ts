import { create } from 'zustand';
import { toast } from 'sonner';
import { Clock, Upload, Check, AlertCircle, MoreVertical } from 'lucide-react';

export interface ScheduledPost {
  id: string;
  videoId: string;
  videoTitle: string;
  videoThumbnail?: string;
  platform: string;
  platformName: string;
  accountName: string;
  scheduledTime: Date;
  status: 'pending' | 'processing' | 'published' | 'failed';
  publishedTime?: Date;
  platformPostId?: string;
  errorMessage?: string;
  caption?: string;
  hashtags?: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface ScheduleData {
  videoId: string;
  platformIds: string[];
  scheduledTime: Date;
  caption?: string;
  hashtags?: string[];
  options?: {
    isReel?: boolean;
    isStory?: boolean;
    visibility?: string;
  };
}

interface ScheduleState {
  // Scheduled posts
  scheduledPosts: ScheduledPost[];
  loading: boolean;
  error: string | null;
  
  // Actions
  getScheduledPosts: () => Promise<void>;
  createScheduledPost: (data: ScheduleData) => Promise<string>;
  updateScheduledPost: (id: string, updates: Partial<ScheduledPost>) => Promise<void>;
  deleteScheduledPost: (id: string) => Promise<void>;
  cancelScheduledPost: (id: string) => Promise<void>;
  reschedulePost: (id: string, newTime: Date) => Promise<void>;
  publishNow: (id: string) => Promise<void>;
  
  // Utility
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  clearError: () => void;
}

export const useScheduleStore = create<ScheduleState>((set, _get) => ({
  // Initial state
  scheduledPosts: [],
  loading: false,
  error: null,

  // Actions
  getScheduledPosts: async () => {
    set({ loading: true, error: null });
    
    try {
      // In a real app, this would fetch from the database
      await new Promise(resolve => setTimeout(resolve, 800));
      
      // Mock data for demonstration
      const mockPosts: ScheduledPost[] = [
        {
          id: '1',
          videoId: '1',
          videoTitle: 'Summer Travel Vlog',
          videoThumbnail: '/thumbnails/summer_vlog.jpg',
          platform: 'instagram',
          platformName: 'Instagram',
          accountName: '@traveler_alex',
          scheduledTime: new Date(Date.now() + 2 * 60 * 60 * 1000), // 2 hours from now
          status: 'pending',
          caption: 'Exploring beautiful European cities this summer! 🌍✈️',
          hashtags: ['travel', 'europe', 'summer', 'vlog'],
          createdAt: new Date('2024-09-25'),
          updatedAt: new Date('2024-09-25')
        },
        {
          id: '2',
          videoId: '2',
          videoTitle: 'Product Demo',
          videoThumbnail: '/thumbnails/product_demo.jpg',
          platform: 'tiktok',
          platformName: 'TikTok',
          accountName: '@alexcreates',
          scheduledTime: new Date(Date.now() + 6 * 60 * 60 * 1000), // 6 hours from now
          status: 'pending',
          caption: 'Check out our new features! #tech #demo',
          hashtags: ['tech', 'demo', 'product'],
          createdAt: new Date('2024-09-24'),
          updatedAt: new Date('2024-09-24')
        },
        {
          id: '3',
          videoId: '1',
          videoTitle: 'Summer Travel Vlog',
          videoThumbnail: '/thumbnails/summer_vlog.jpg',
          platform: 'youtube',
          platformName: 'YouTube',
          accountName: 'Alex Channel',
          scheduledTime: new Date('2024-09-27T14:30:00'),
          status: 'pending',
          caption: 'Full travel vlog from my European adventure!',
          hashtags: ['travelvlog', 'europe', 'summer'],
          createdAt: new Date('2024-09-23'),
          updatedAt: new Date('2024-09-23')
        },
        {
          id: '4',
          videoId: '3',
          videoTitle: 'Morning Routine',
          videoThumbnail: '/thumbnails/morning_routine.jpg',
          platform: 'instagram',
          platformName: 'Instagram',
          accountName: '@traveler_alex',
          scheduledTime: new Date('2024-09-20T08:00:00'),
          status: 'published',
          publishedTime: new Date('2024-09-20T08:00:00'),
          platformPostId: 'instagram_12345',
          caption: 'My productive morning routine! 🌅☕',
          hashtags: ['morningroutine', 'productivity', 'health'],
          createdAt: new Date('2024-09-19'),
          updatedAt: new Date('2024-09-20')
        },
        {
          id: '5',
          videoId: '4',
          videoTitle: 'Cooking Tutorial',
          videoThumbnail: '/thumbnails/cooking_tutorial.jpg',
          platform: 'tiktok',
          platformName: 'TikTok',
          accountName: '@alexcreates',
          scheduledTime: new Date('2024-09-18T18:00:00'),
          status: 'failed',
          errorMessage: 'Upload timeout - network connection lost',
          caption: 'Quick and easy pasta recipe!',
          hashtags: ['cooking', 'recipe', 'food'],
          createdAt: new Date('2024-09-17'),
          updatedAt: new Date('2024-09-18')
        }
      ];
      
      set({ scheduledPosts: mockPosts, loading: false });
      
    } catch (error) {
      set({ 
        loading: false,
        error: error instanceof Error ? error.message : 'Failed to load scheduled posts'
      });
      toast.error('Failed to load scheduled posts');
    }
  },

  createScheduledPost: async (data: ScheduleData): Promise<string> => {
    set({ loading: true, error: null });
    
    try {
      // In a real app, this would:
      // 1. Validate data
      // 2. Create entries in database
      // 3. Schedule with the scheduler service
      
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const postId = `scheduled_${Date.now()}`;
      
      // For now, create mock posts for each platform
      const newPosts: ScheduledPost[] = data.platformIds.map((platformId, index) => {
        const platformNames: Record<string, string> = {
          instagram: 'Instagram',
          tiktok: 'TikTok',
          youtube: 'YouTube'
        };
        
        const accountNames: Record<string, string> = {
          instagram: '@traveler_alex',
          tiktok: '@alexcreates',
          youtube: 'Alex Channel'
        };
        
        return {
          id: `${postId}_${index}`,
          videoId: data.videoId,
          videoTitle: 'New Video', // Would be fetched from video store
          videoThumbnail: '/thumbnails/default.jpg',
          platform: platformId,
          platformName: platformNames[platformId] || platformId,
          accountName: accountNames[platformId] || 'Unknown',
          scheduledTime: data.scheduledTime,
          status: 'pending',
          caption: data.caption,
          hashtags: data.hashtags,
          createdAt: new Date(),
          updatedAt: new Date()
        };
      });
      
      set(state => ({
        scheduledPosts: [...newPosts, ...state.scheduledPosts],
        loading: false
      }));
      
      toast.success(`Scheduled ${data.platformIds.length} post(s) for ${data.scheduledTime.toLocaleString()}`);
      
      return postId;
      
    } catch (error) {
      set({ 
        loading: false,
        error: error instanceof Error ? error.message : 'Failed to schedule post'
      });
      toast.error('Failed to schedule post');
      throw error;
    }
  },

  updateScheduledPost: async (id: string, updates: Partial<ScheduledPost>) => {
    set({ loading: true, error: null });
    
    try {
      // In a real app, this would update in the database
      await new Promise(resolve => setTimeout(resolve, 300));
      
      set(state => ({
        scheduledPosts: state.scheduledPosts.map(post =>
          post.id === id
            ? { ...post, ...updates, updatedAt: new Date() }
            : post
        ),
        loading: false
      }));
      
      toast.success('Schedule updated successfully');
      
    } catch (error) {
      set({ 
        loading: false,
        error: error instanceof Error ? error.message : 'Failed to update schedule'
      });
      toast.error('Failed to update schedule');
    }
  },

  deleteScheduledPost: async (id: string) => {
    set({ loading: true, error: null });
    
    try {
      // In a real app, this would delete from the database
      await new Promise(resolve => setTimeout(resolve, 300));
      
      set(state => ({
        scheduledPosts: state.scheduledPosts.filter(post => post.id !== id),
        loading: false
      }));
      
      toast.success('Schedule deleted successfully');
      
    } catch (error) {
      set({ 
        loading: false,
        error: error instanceof Error ? error.message : 'Failed to delete schedule'
      });
      toast.error('Failed to delete schedule');
    }
  },

  cancelScheduledPost: async (id: string) => {
    set({ loading: true, error: null });
    
    try {
      // In a real app, this would:
      // 1. Cancel with the scheduler service
      // 2. Update status in database
      
      await new Promise(resolve => setTimeout(resolve, 500));
      
      set(state => ({
        scheduledPosts: state.scheduledPosts.map(post =>
          post.id === id
            ? { ...post, status: 'failed', errorMessage: 'Cancelled by user', updatedAt: new Date() }
            : post
        ),
        loading: false
      }));
      
      toast.success('Schedule cancelled successfully');
      
    } catch (error) {
      set({ 
        loading: false,
        error: error instanceof Error ? error.message : 'Failed to cancel schedule'
      });
      toast.error('Failed to cancel schedule');
    }
  },

  reschedulePost: async (id: string, newTime: Date) => {
    set({ loading: true, error: null });
    
    try {
      // In a real app, this would:
      // 1. Reschedule with the scheduler service
      // 2. Update time in database
      
      await new Promise(resolve => setTimeout(resolve, 500));
      
      set(state => ({
        scheduledPosts: state.scheduledPosts.map(post =>
          post.id === id
            ? { ...post, scheduledTime: newTime, updatedAt: new Date() }
            : post
        ),
        loading: false
      }));
      
      toast.success('Post rescheduled successfully');
      
    } catch (error) {
      set({ 
        loading: false,
        error: error instanceof Error ? error.message : 'Failed to reschedule'
      });
      toast.error('Failed to reschedule');
    }
  },

  publishNow: async (id: string) => {
    set({ loading: true, error: null });
    
    try {
      // In a real app, this would:
      // 1. Trigger immediate publish via platform APIs
      // 2. Update status in database
      
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      set(state => ({
        scheduledPosts: state.scheduledPosts.map(post =>
          post.id === id
            ? { 
                ...post, 
                status: 'published', 
                publishedTime: new Date(),
                scheduledTime: new Date(),
                updatedAt: new Date() 
              }
            : post
        ),
        loading: false
      }));
      
      toast.success('Post published successfully');
      
    } catch (error) {
      set(state => ({
        scheduledPosts: state.scheduledPosts.map(post =>
          post.id === id
            ? { 
                ...post, 
                status: 'failed', 
                errorMessage: 'Failed to publish immediately',
                updatedAt: new Date() 
              }
            : post
        ),
        loading: false,
        error: error instanceof Error ? error.message : 'Failed to publish'
      }));
      
      toast.error('Failed to publish post');
    }
  },

  setLoading: (loading) => set({ loading }),
  
  setError: (error) => set({ error }),
  
  clearError: () => set({ error: null })
}));

// Helper function to format time remaining
export const getTimeRemaining = (scheduledTime: Date): string => {
  const now = new Date();
  const diff = scheduledTime.getTime() - now.getTime();
  
  if (diff <= 0) {
    return 'Now';
  }
  
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  
  if (days > 0) {
    return `${days}d ${hours}h`;
  } else if (hours > 0) {
    return `${hours}h ${minutes}m`;
  } else {
    return `${minutes}m`;
  }
};

// Helper function to get status color
export const getStatusColor = (status: string): string => {
  switch (status) {
    case 'pending':
      return 'bg-blue-100 text-blue-800';
    case 'processing':
      return 'bg-yellow-100 text-yellow-800';
    case 'published':
      return 'bg-green-100 text-green-800';
    case 'failed':
      return 'bg-red-100 text-red-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
};

// Helper function to get status icon
export const getStatusIcon = (status: string) => {
  switch (status) {
    case 'pending':
      return Clock;
    case 'processing':
      return Upload;
    case 'published':
      return Check;
    case 'failed':
      return AlertCircle;
    default:
      return MoreVertical;
  }
};