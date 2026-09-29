import React, { useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Video, Calendar, CheckCircle, TrendingUp } from 'lucide-react';
import StatCard from '../components/StatCard';
import RecentVideos from '../components/RecentVideos';
import UpcomingSchedule from '../components/UpcomingSchedule';
import ConnectedPlatforms from '../components/ConnectedPlatforms';
import { useVideoStore } from '../store/video-store';
import { useScheduleStore } from '../store/schedule-store';

// All four stat cards below are derived from the user's real data (videos
// uploaded, posts scheduled/published) rather than the previous version's
// hardcoded "127" / "18" / "342" / "4.8%" values, which never changed no
// matter what the user actually did in the app.
//
// "Engagement Rate" specifically requires real analytics data pulled back
// from each platform after a post is published (views/likes/comments/
// shares) -- there is no such analytics-collection pipeline wired up yet
// (see electron/database.ts's `analytics` table, which exists but is
// never populated by anything), so it deliberately shows "--" instead of
// a fabricated percentage.
const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const { videos, getVideos } = useVideoStore();
  const { scheduledPosts, getScheduledPosts } = useScheduleStore();

  useEffect(() => {
    getVideos();
    getScheduledPosts();
  }, [getVideos, getScheduledPosts]);

  const stats = useMemo(() => {
    const scheduledCount = scheduledPosts.filter(p => p.status === 'pending').length;
    const publishedCount = scheduledPosts.filter(p => p.status === 'published').length;

    return [
      {
        title: 'Total Videos',
        value: String(videos.length),
        icon: Video,
        color: 'bg-purple-100 text-purple-600',
      },
      {
        title: 'Scheduled Posts',
        value: String(scheduledCount),
        icon: Calendar,
        color: 'bg-blue-100 text-blue-600',
      },
      {
        title: 'Published',
        value: String(publishedCount),
        icon: CheckCircle,
        color: 'bg-green-100 text-green-600',
      },
      {
        title: 'Engagement Rate',
        value: '--',
        icon: TrendingUp,
        color: 'bg-orange-100 text-orange-600',
        trend: 'Analytics not yet available',
        note: true,
      },
    ];
  }, [videos, scheduledPosts]);

  return (
    <div className="space-y-6">
      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => (
          <StatCard key={stat.title} {...stat} />
        ))}
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Videos */}
        <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-lg font-semibold text-foreground">Recent Videos</h3>
            <button
              onClick={() => navigate('/videos')}
              className="text-primary text-sm font-medium hover:underline"
            >
              View All
            </button>
          </div>
          <RecentVideos />
        </div>

        {/* Upcoming Schedule */}
        <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-lg font-semibold text-foreground">Upcoming Posts</h3>
            <button
              onClick={() => navigate('/schedule')}
              className="text-primary text-sm font-medium hover:underline"
            >
              View Calendar
            </button>
          </div>
          <UpcomingSchedule />
        </div>
      </div>

      {/* Connected Platforms */}
      <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-foreground mb-5">Connected Platforms</h3>
        <ConnectedPlatforms />
      </div>
    </div>
  );
};

export default Dashboard;
