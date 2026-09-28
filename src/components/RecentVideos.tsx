import React from 'react';
import { Play, Calendar, MoreVertical } from 'lucide-react';
import { formatDuration } from '../store/video-store';

const RecentVideos: React.FC = () => {
  const videos = [
    {
      id: '1',
      title: 'Summer Travel Vlog',
      duration: 45,
      added: '2 days ago',
      platforms: ['instagram', 'tiktok']
    },
    {
      id: '2',
      title: 'Product Demo',
      duration: 60,
      added: '1 week ago',
      platforms: ['youtube', 'linkedin']
    }
  ];

  const getPlatformIcon = (platform: string) => {
    switch (platform) {
      case 'instagram':
        return '📷';
      case 'tiktok':
        return '🎵';
      case 'youtube':
        return '📺';
      case 'linkedin':
        return '💼';
      default:
        return '🔗';
    }
  };

  const getPlatformColor = (platform: string) => {
    switch (platform) {
      case 'instagram':
        return 'bg-purple-100 text-purple-600';
      case 'tiktok':
        return 'bg-gray-100 text-gray-800';
      case 'youtube':
        return 'bg-red-100 text-red-600';
      case 'linkedin':
        return 'bg-blue-100 text-blue-600';
      default:
        return 'bg-gray-100 text-gray-600';
    }
  };

  return (
    <div className="space-y-4">
      {videos.map((video) => (
        <div key={video.id} className="flex items-center space-x-4 p-3 hover:bg-muted/50 rounded-lg transition-colors">
          {/* Thumbnail */}
          <div className="relative w-20 h-20 bg-muted rounded-lg overflow-hidden flex-shrink-0">
            <div className="absolute inset-0 flex items-center justify-center">
              <Play className="w-8 h-8 text-white/70" />
            </div>
            <div className="absolute bottom-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded">
              {formatDuration(video.duration)}
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between">
              <div>
                <h4 className="font-medium text-foreground">{video.title}</h4>
                <p className="text-sm text-muted-foreground mt-1">
                  {formatDuration(video.duration)} • {video.added}
                </p>
                <div className="flex items-center space-x-2 mt-1">
                  {video.platforms.map((platform) => (
                    <span
                      key={platform}
                      className={`px-2 py-1 ${getPlatformColor(platform)} text-xs rounded-full flex items-center space-x-1`}
                    >
                      <span>{getPlatformIcon(platform)}</span>
                      <span>
                        {platform === 'instagram' ? 'Instagram' :
                         platform === 'tiktok' ? 'TikTok' :
                         platform === 'youtube' ? 'YouTube' :
                         platform === 'linkedin' ? 'LinkedIn' : platform}
                      </span>
                    </span>
                  ))}
                </div>
              </div>
              
              <button className="text-gray-400 hover:text-foreground">
                <MoreVertical className="w-4 h-4" />
              </button>
            </div>

            {/* Quick Actions */}
            <div className="flex items-center space-x-2 mt-3">
              <button className="inline-flex items-center space-x-2 px-3 py-1.5 bg-primary/10 text-primary text-sm font-medium rounded-lg hover:bg-primary/20 transition-colors">
                <Calendar className="w-3.5 h-3.5" />
                <span>Schedule</span>
              </button>
              
              <button className="inline-flex items-center space-x-2 px-3 py-1.5 bg-muted text-foreground text-sm font-medium rounded-lg hover:bg-muted/80 transition-colors">
                <span>Edit</span>
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default RecentVideos;