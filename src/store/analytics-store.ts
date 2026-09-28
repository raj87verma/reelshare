import { create } from 'zustand';

interface PlatformStats {
  totalPosts: number;
  avgEngagement: number;
  totalViews: number;
}

interface AnalyticsData {
  totalPosts: number;
  totalViews: number;
  avgEngagement: number;
  scheduledPosts: number;
  platformStats: {
    instagram: PlatformStats;
    tiktok: PlatformStats;
    youtube: PlatformStats;
  };
  topVideos: Array<{
    id: string;
    title: string;
    platform: string;
    views: number;
    engagement: number;
  }>;
}

interface AnalyticsState {
  analyticsData: AnalyticsData;
  isLoading: boolean;
  fetchAnalytics: () => Promise<void>;
  refreshAnalytics: () => Promise<void>;
}

export const useAnalyticsStore = create<AnalyticsState>((set, get) => ({
  analyticsData: {
    totalPosts: 124,
    totalViews: 254000,
    avgEngagement: 4.2,
    scheduledPosts: 18,
    platformStats: {
      instagram: {
        totalPosts: 68,
        avgEngagement: 3.8,
        totalViews: 98000,
      },
      tiktok: {
        totalPosts: 42,
        avgEngagement: 5.1,
        totalViews: 132000,
      },
      youtube: {
        totalPosts: 14,
        avgEngagement: 3.5,
        totalViews: 24000,
      },
    },
    topVideos: [
      {
        id: '1',
        title: 'Morning Coffee Routine',
        platform: 'TikTok',
        views: 125000,
        engagement: 8.2,
      },
      {
        id: '2',
        title: 'Sunset Timelapse',
        platform: 'Instagram',
        views: 78000,
        engagement: 5.6,
      },
      {
        id: '3',
        title: 'Coding Workflow Tips',
        platform: 'YouTube',
        views: 42000,
        engagement: 7.1,
      },
      {
        id: '4',
        title: 'Weekend Vlog',
        platform: 'Instagram',
        views: 65000,
        engagement: 4.8,
      },
      {
        id: '5',
        title: 'Quick Recipe Tutorial',
        platform: 'TikTok',
        views: 92000,
        engagement: 6.3,
      },
    ],
  },
  isLoading: false,
  fetchAnalytics: async () => {
    // In a real app, this would fetch from the backend
    set({ isLoading: true });
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 500));
    set({ isLoading: false });
  },
  refreshAnalytics: async () => {
    const { fetchAnalytics } = get();
    await fetchAnalytics();
  },
}));