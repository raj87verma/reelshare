import React from 'react';
import { Video, Calendar, CheckCircle, TrendingUp } from 'lucide-react';
import StatCard from '../components/StatCard';
import RecentVideos from '../components/RecentVideos';
import UpcomingSchedule from '../components/UpcomingSchedule';
import ConnectedPlatforms from '../components/ConnectedPlatforms';

const Dashboard: React.FC = () => {
  const stats = [
    {
      title: 'Total Videos',
      value: '127',
      icon: Video,
      color: 'bg-purple-100 text-purple-600',
      trend: '+12%',
    },
    {
      title: 'Scheduled Posts',
      value: '18',
      icon: Calendar,
      color: 'bg-blue-100 text-blue-600',
      trend: '+5%',
    },
    {
      title: 'Published',
      value: '342',
      icon: CheckCircle,
      color: 'bg-green-100 text-green-600',
      trend: '+23%',
    },
    {
      title: 'Engagement Rate',
      value: '4.8%',
      icon: TrendingUp,
      color: 'bg-orange-100 text-orange-600',
      trend: '+1.2%',
    },
  ];

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
            <button className="text-primary text-sm font-medium hover:underline">
              View All
            </button>
          </div>
          <RecentVideos />
        </div>

        {/* Upcoming Schedule */}
        <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-lg font-semibold text-foreground">Today's Schedule</h3>
            <button className="text-primary text-sm font-medium hover:underline">
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