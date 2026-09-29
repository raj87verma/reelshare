import { create } from 'zustand';
import { toast } from 'sonner';
import { Clock, Upload, Check, AlertCircle, MoreVertical } from 'lucide-react';
import { useAppStore } from './app-store';
import { useSocialAccountsStore } from './social-accounts-store';

// See the identical helper in social-accounts-store.ts / app-store.ts --
// strips Electron's ipcRenderer.invoke() error-wrapper boilerplate so
// scheduling errors shown to the user are clean (e.g. "TikTok API doesn't
// support direct scheduling" rather than "Error invoking remote method
// 'scheduler:schedulePost': Error: ...").
function cleanIpcErrorMessage(error: unknown): string {
  const raw = error instanceof Error ? error.message : String(error);
  let message = raw;
  for (let i = 0; i < 5; i++) {
    const ipcMatch = message.match(/^Error invoking remote method '[^']*':\s*(?:Error:\s*)?(.*)$/s);
    if (ipcMatch) {
      message = ipcMatch[1].trim();
      continue;
    }
    break;
  }
  return message;
}

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

// A raw row as returned by the main process's SQLite layer (see
// dbService.getScheduledPost[s]() in electron/database.ts -- a JOIN
// across scheduled_posts, videos, and social_accounts).
interface RawScheduledPostRow {
  id: string;
  video_id: string;
  account_id: string;
  scheduled_time: string;
  status: 'pending' | 'processing' | 'published' | 'failed';
  published_time: string | null;
  platform_post_id: string | null;
  error_message: string | null;
  created_at: string;
  updated_at: string;
  video_title: string;
  thumbnail_path: string;
  platform: string;
  account_name: string;
  caption: string | null;
  hashtags: string | null;
}

const platformDisplayNames: Record<string, string> = {
  instagram: 'Instagram',
  tiktok: 'TikTok',
  youtube: 'YouTube',
  facebook: 'Facebook'
};

function rowToScheduledPost(row: RawScheduledPostRow): ScheduledPost {
  return {
    id: row.id,
    videoId: row.video_id,
    videoTitle: row.video_title,
    videoThumbnail: row.thumbnail_path,
    platform: row.platform,
    platformName: platformDisplayNames[row.platform] || row.platform,
    accountName: row.account_name,
    scheduledTime: new Date(row.scheduled_time),
    status: row.status,
    publishedTime: row.published_time ? new Date(row.published_time) : undefined,
    platformPostId: row.platform_post_id || undefined,
    errorMessage: row.error_message || undefined,
    caption: row.caption || undefined,
    hashtags: row.hashtags ? JSON.parse(row.hashtags) : undefined,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at)
  };
}

function getCurrentUserId(): string | null {
  return useAppStore.getState().user?.id || null;
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

export const useScheduleStore = create<ScheduleState>((set, get) => ({
  // Initial state
  scheduledPosts: [],
  loading: false,
  error: null,

  // Loads this user's real scheduled posts from SQLite (across every
  // status -- pending/processing/published/failed -- since the Schedule
  // page's calendar and status counters need all of them, not just the
  // pending ones the background scheduler cares about). Replaces the
  // previous version, which returned 5 hardcoded posts referencing a
  // fictional '@traveler_alex' / '@alexcreates' / 'Alex Channel' account
  // that was never actually connected.
  getScheduledPosts: async () => {
    const userId = getCurrentUserId();
    if (!userId) {
      set({ scheduledPosts: [], loading: false });
      return;
    }

    set({ loading: true, error: null });
    
    try {
      if (!window.electronAPI?.db?.getScheduledPosts) {
        set({ scheduledPosts: [], loading: false });
        return;
      }

      const rows = (await window.electronAPI.db.getScheduledPosts(userId, undefined, 500)) as RawScheduledPostRow[];
      const scheduledPosts = rows.map(rowToScheduledPost);

      set({ scheduledPosts, loading: false });
      
    } catch (error) {
      set({ 
        loading: false,
        error: error instanceof Error ? error.message : 'Failed to load scheduled posts'
      });
      toast.error('Failed to load scheduled posts');
    }
  },

  // Persists a scheduled post per selected platform via the real
  // scheduler:schedulePost IPC channel (electron/scheduler.ts), which
  // inserts a row into the scheduled_posts SQLite table and arms a real
  // cron job that will actually attempt to publish via that platform's
  // API when the scheduled time arrives. Replaces the previous version,
  // which waited 1 second and pushed fabricated ScheduledPost objects
  // into local state only -- nothing was ever saved, so the schedule
  // vanished on refresh/restart and the background scheduler never knew
  // about it.
  createScheduledPost: async (data: ScheduleData): Promise<string> => {
    const userId = getCurrentUserId();
    if (!userId) {
      throw new Error('You must be logged in to schedule a post');
    }

    set({ loading: true, error: null });
    
    try {
      if (!window.electronAPI?.scheduler?.schedulePost) {
        throw new Error('Scheduling is not available in this environment');
      }

      const platforms = useSocialAccountsStore.getState().platforms;
      const scheduledIds: string[] = [];

      for (const platformId of data.platformIds) {
        const accountId = platforms[platformId]?.accountId;
        if (!accountId) {
          // Should not normally happen -- the Schedule form only lets
          // the user pick platforms that are already connected -- but
          // guard against a stale/disconnected platform between form
          // open and submit rather than silently dropping this platform.
          console.error(`No connected account id found for platform "${platformId}"; skipping`);
          continue;
        }

        const postId: string = await window.electronAPI.scheduler.schedulePost({
          video_id: data.videoId,
          account_id: accountId,
          scheduled_time: data.scheduledTime.toISOString(),
          status: 'pending',
          caption: data.caption || null,
          hashtags: data.hashtags ? JSON.stringify(data.hashtags) : null
        });
        scheduledIds.push(postId);
      }

      if (scheduledIds.length === 0) {
        throw new Error('None of the selected platforms have a connected account anymore');
      }

      set({ loading: false });
      toast.success(`Scheduled ${scheduledIds.length} post(s) for ${data.scheduledTime.toLocaleString()}`);

      // Refresh the list so the new post(s) show up immediately.
      await get().getScheduledPosts();

      return scheduledIds[0];
      
    } catch (error) {
      const message = cleanIpcErrorMessage(error);
      set({ loading: false, error: message });
      toast.error(message);
      throw new Error(message);
    }
  },

  updateScheduledPost: async (id: string, updates: Partial<ScheduledPost>) => {
    set({ loading: true, error: null });
    
    try {
      if (updates.scheduledTime) {
        if (!window.electronAPI?.scheduler?.reschedulePost) {
          throw new Error('Scheduling is not available in this environment');
        }
        await window.electronAPI.scheduler.reschedulePost(id, updates.scheduledTime.toISOString());
      }

      await get().getScheduledPosts();
      set({ loading: false });
      
      toast.success('Schedule updated successfully');
      
    } catch (error) {
      const message = cleanIpcErrorMessage(error);
      set({ loading: false, error: message });
      toast.error(message);
    }
  },

  deleteScheduledPost: async (id: string) => {
    set({ loading: true, error: null });
    
    try {
      if (!window.electronAPI?.scheduler?.cancelPost) {
        throw new Error('Scheduling is not available in this environment');
      }

      await window.electronAPI.scheduler.cancelPost(id);
      
      set(state => ({
        scheduledPosts: state.scheduledPosts.filter(post => post.id !== id),
        loading: false
      }));
      
      toast.success('Schedule cancelled successfully');
      
    } catch (error) {
      const message = cleanIpcErrorMessage(error);
      set({ loading: false, error: message });
      toast.error(message);
    }
  },

  cancelScheduledPost: async (id: string) => {
    set({ loading: true, error: null });
    
    try {
      if (!window.electronAPI?.scheduler?.cancelPost) {
        throw new Error('Scheduling is not available in this environment');
      }

      await window.electronAPI.scheduler.cancelPost(id);
      await get().getScheduledPosts();
      set({ loading: false });
      
      toast.success('Schedule cancelled successfully');
      
    } catch (error) {
      const message = cleanIpcErrorMessage(error);
      set({ loading: false, error: message });
      toast.error(message);
    }
  },

  reschedulePost: async (id: string, newTime: Date) => {
    set({ loading: true, error: null });
    
    try {
      if (!window.electronAPI?.scheduler?.reschedulePost) {
        throw new Error('Scheduling is not available in this environment');
      }

      await window.electronAPI.scheduler.reschedulePost(id, newTime.toISOString());
      await get().getScheduledPosts();
      set({ loading: false });
      
      toast.success('Post rescheduled successfully');
      
    } catch (error) {
      const message = cleanIpcErrorMessage(error);
      set({ loading: false, error: message });
      toast.error(message);
    }
  },

  // Immediate/manual publish is not yet wired to a dedicated "publish
  // right now" IPC channel (electron/scheduler.ts's executePost() is
  // currently only triggered by a post's own cron job firing at its
  // scheduled time). Rather than fake success/failure locally as the
  // previous version did, this reschedules the post to "now" so the
  // real background scheduler picks it up and actually attempts to
  // publish via the real platform API on its next tick.
  publishNow: async (id: string) => {
    set({ loading: true, error: null });
    
    try {
      if (!window.electronAPI?.scheduler?.reschedulePost) {
        throw new Error('Scheduling is not available in this environment');
      }

      await window.electronAPI.scheduler.reschedulePost(id, new Date().toISOString());
      await get().getScheduledPosts();
      set({ loading: false });

      toast.success('Post queued for immediate publishing');
      
    } catch (error) {
      const message = cleanIpcErrorMessage(error);
      set({ loading: false, error: message });
      toast.error(message);
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
