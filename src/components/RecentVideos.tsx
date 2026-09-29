import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Play, Calendar, MoreVertical } from 'lucide-react';
import { useVideoStore, formatDuration } from '../store/video-store';

// Shows the user's actual most-recently-uploaded videos (from the SQLite-
// backed video store), rather than the previous version's two hardcoded
// fake entries ("Summer Travel Vlog", "Product Demo") that showed up
// regardless of what the user had actually uploaded.
const RecentVideos: React.FC = () => {
  const navigate = useNavigate();
  const { videos, getVideos } = useVideoStore();

  useEffect(() => {
    getVideos();
  }, [getVideos]);

  const recentVideos = videos.slice(0, 5);

  const formatRelativeTime = (date: Date): string => {
    const diffMs = Date.now() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    if (diffDays <= 0) return 'today';
    if (diffDays === 1) return '1 day ago';
    if (diffDays < 7) return `${diffDays} days ago`;
    const diffWeeks = Math.floor(diffDays / 7);
    if (diffWeeks === 1) return '1 week ago';
    if (diffWeeks < 5) return `${diffWeeks} weeks ago`;
    const diffMonths = Math.floor(diffDays / 30);
    return diffMonths <= 1 ? '1 month ago' : `${diffMonths} months ago`;
  };

  if (recentVideos.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">No videos uploaded yet</p>
        <button
          onClick={() => navigate('/videos', { state: { openUpload: true } })}
          className="text-primary text-sm font-medium hover:underline mt-2"
        >
          Upload your first video
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {recentVideos.map((video) => (
        <div key={video.id} className="flex items-center space-x-4 p-3 hover:bg-muted/50 rounded-lg transition-colors">
          {/* Thumbnail */}
          <div className="relative w-20 h-20 bg-muted rounded-lg overflow-hidden flex-shrink-0">
            {video.thumbnailPath ? (
              <div
                className="absolute inset-0 bg-cover bg-center"
                style={{ backgroundImage: `url(${video.thumbnailPath})` }}
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center">
                <Play className="w-8 h-8 text-white/70" />
              </div>
            )}
            <div className="absolute bottom-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded">
              {formatDuration(video.durationSeconds)}
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between">
              <div>
                <h4 className="font-medium text-foreground truncate">{video.title}</h4>
                <p className="text-sm text-muted-foreground mt-1">
                  {formatDuration(video.durationSeconds)} • {formatRelativeTime(video.createdAt)}
                </p>
              </div>

              <button className="text-gray-400 hover:text-foreground">
                <MoreVertical className="w-4 h-4" />
              </button>
            </div>

            {/* Quick Actions */}
            <div className="flex items-center space-x-2 mt-3">
              <button
                onClick={() => navigate('/schedule', { state: { openScheduleForVideoId: video.id } })}
                className="inline-flex items-center space-x-2 px-3 py-1.5 bg-primary/10 text-primary text-sm font-medium rounded-lg hover:bg-primary/20 transition-colors"
              >
                <Calendar className="w-3.5 h-3.5" />
                <span>Schedule</span>
              </button>

              <button
                onClick={() => navigate('/videos')}
                className="inline-flex items-center space-x-2 px-3 py-1.5 bg-muted text-foreground text-sm font-medium rounded-lg hover:bg-muted/80 transition-colors"
              >
                <span>View in Library</span>
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default RecentVideos;
