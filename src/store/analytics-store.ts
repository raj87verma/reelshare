import { create } from 'zustand';
import { useScheduleStore } from './schedule-store';

interface PlatformStats {
  totalPosts: number;
}

interface AnalyticsData {
  totalPosts: number;
  scheduledPosts: number;
  platformStats: {
    instagram: PlatformStats;
    tiktok: PlatformStats;
    youtube: PlatformStats;
    facebook: PlatformStats;
  };
}

interface AnalyticsState {
  analyticsData: AnalyticsData;
  isLoading: boolean;
  fetchAnalytics: () => Promise<void>;
  refreshAnalytics: () => Promise<void>;
}

const emptyPlatformStats: PlatformStats = { totalPosts: 0 };

// Post counts (total published, scheduled, per-platform) are real,
// derived from the same scheduled_posts data as the Schedule page.
// View counts, engagement rate, and "top performing content" are
// deliberately NOT included here: those require actually calling back to
// each platform's analytics API after a post is published (see
// electron/social-platforms/*.ts's getAnalytics() methods, and the
// `analytics` SQLite table in electron/database.ts, which exists but is
// never written to by anything yet) -- there is no real data source for
// them. The previous version of this store fabricated all of these
// numbers (124 total posts, 254,000 views, 4.2% engagement, a fixed list
// of 5 "top videos" that were never actually uploaded by the user) as
// static initial state that never changed no matter what the user did.
export const useAnalyticsStore = create<AnalyticsState>((set) => ({
  analyticsData: {
    totalPosts: 0,
    scheduledPosts: 0,
    platformStats: {
      instagram: emptyPlatformStats,
      tiktok: emptyPlatformStats,
      youtube: emptyPlatformStats,
      facebook: emptyPlatformStats,
    },
  },
  isLoading: false,

  fetchAnalytics: async () => {
    set({ isLoading: true });

    const { getScheduledPosts } = useScheduleStore.getState();
    // Make sure we have the latest scheduled posts before deriving stats
    // from them (Dashboard/Schedule may have already triggered this, but
    // Analytics can be opened first).
    await getScheduledPosts();
    const posts = useScheduleStore.getState().scheduledPosts;

    const countByPlatform = (platform: string) =>
      posts.filter(p => p.platform === platform && p.status === 'published').length;

    set({
      analyticsData: {
        totalPosts: posts.filter(p => p.status === 'published').length,
        scheduledPosts: posts.filter(p => p.status === 'pending').length,
        platformStats: {
          instagram: { totalPosts: countByPlatform('instagram') },
          tiktok: { totalPosts: countByPlatform('tiktok') },
          youtube: { totalPosts: countByPlatform('youtube') },
          facebook: { totalPosts: countByPlatform('facebook') },
        },
      },
      isLoading: false,
    });
  },

  refreshAnalytics: async () => {
    const { fetchAnalytics } = useAnalyticsStore.getState();
    await fetchAnalytics();
  },
}));
