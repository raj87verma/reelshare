import React, { useEffect } from 'react';
import { Clock, X } from 'lucide-react';
import { useScheduleStore, getStatusIcon, getStatusColor } from '../store/schedule-store';
import { getPlatformIcon, getPlatformColor } from '../store/social-accounts-store';

// Shows the user's actual upcoming scheduled posts (from SQLite via
// useScheduleStore), rather than the previous version's two hardcoded
// fake posts ("Product Launch Announcement", "Weekly Tutorial") that
// showed up regardless of whether the user had scheduled anything.
const UpcomingSchedule: React.FC = () => {
  const { scheduledPosts, getScheduledPosts, cancelScheduledPost } = useScheduleStore();

  useEffect(() => {
    getScheduledPosts();
  }, [getScheduledPosts]);

  const now = new Date();
  const upcoming = scheduledPosts
    .filter(post => post.status === 'pending' && post.scheduledTime > now)
    .sort((a, b) => a.scheduledTime.getTime() - b.scheduledTime.getTime())
    .slice(0, 5);

  const formatTimeFromNow = (date: Date): string => {
    const diffMs = date.getTime() - Date.now();
    const diffMins = Math.round(diffMs / (1000 * 60));
    if (diffMins < 60) return `${diffMins} minutes from now`;
    const diffHours = Math.round(diffMins / 60);
    if (diffHours < 24) return `${diffHours} hour${diffHours === 1 ? '' : 's'} from now`;
    const diffDays = Math.round(diffHours / 24);
    return `${diffDays} day${diffDays === 1 ? '' : 's'} from now`;
  };

  if (upcoming.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">No posts scheduled</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {upcoming.map((post) => {
        const StatusIcon = post.status === 'pending' ? Clock : getStatusIcon(post.status);

        return (
          <div key={post.id} className="p-4 border border-border rounded-lg hover:border-primary/30 transition-colors">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h4 className="font-medium text-foreground">{post.videoTitle}</h4>
                <p className="text-sm text-muted-foreground mt-1">
                  <Clock className="w-3 h-3 inline mr-1" />
                  {post.scheduledTime.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                  {' • '}
                  {formatTimeFromNow(post.scheduledTime)}
                </p>
                <div className="flex items-center space-x-2 mt-2">
                  <span className={`px-2 py-1 bg-gradient-to-r ${getPlatformColor(post.platform)} text-white text-xs rounded-full flex items-center space-x-1`}>
                    <span>{getPlatformIcon(post.platform)}</span>
                    <span>{post.platformName}</span>
                  </span>

                  <span className={`px-2 py-1 ${getStatusColor(post.status)} text-xs rounded-full flex items-center space-x-1`}>
                    <StatusIcon className="w-3 h-3" />
                    <span>{post.status.charAt(0).toUpperCase() + post.status.slice(1)}</span>
                  </span>
                </div>
              </div>

              <button
                onClick={() => cancelScheduledPost(post.id)}
                className="text-gray-400 hover:text-red-500 transition-colors p-2"
                title="Cancel this scheduled post"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default UpcomingSchedule;
