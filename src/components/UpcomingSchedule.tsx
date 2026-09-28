import React from 'react';
import { Clock, X, Check, AlertCircle } from 'lucide-react';

const UpcomingSchedule: React.FC = () => {
  const scheduledPosts = [
    {
      id: '1',
      title: 'Product Launch Announcement',
      time: '2:30 PM',
      timeFromNow: '45 minutes from now',
      platform: 'instagram',
      status: 'ready'
    },
    {
      id: '2',
      title: 'Weekly Tutorial',
      time: '6:00 PM',
      timeFromNow: '4 hours from now',
      platform: 'youtube',
      status: 'ready'
    }
  ];

  const getPlatformIcon = (platform: string) => {
    switch (platform) {
      case 'instagram':
        return '📷';
      case 'youtube':
        return '📺';
      default:
        return '🔗';
    }
  };

  const getPlatformColor = (platform: string) => {
    switch (platform) {
      case 'instagram':
        return 'bg-purple-100 text-purple-600';
      case 'youtube':
        return 'bg-red-100 text-red-600';
      default:
        return 'bg-gray-100 text-gray-600';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'ready':
        return Check;
      case 'processing':
        return Clock;
      case 'failed':
        return AlertCircle;
      default:
        return Clock;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ready':
        return 'text-green-600 bg-green-100';
      case 'processing':
        return 'text-yellow-600 bg-yellow-100';
      case 'failed':
        return 'text-red-600 bg-red-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  return (
    <div className="space-y-4">
      {scheduledPosts.map((post) => {
        const StatusIcon = getStatusIcon(post.status);
        
        return (
          <div key={post.id} className="p-4 border border-border rounded-lg hover:border-primary/30 transition-colors">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h4 className="font-medium text-foreground">{post.title}</h4>
                <p className="text-sm text-muted-foreground mt-1">
                  <Clock className="w-3 h-3 inline mr-1" />
                  {post.time} • {post.timeFromNow}
                </p>
                <div className="flex items-center space-x-2 mt-2">
                  <span className={`px-2 py-1 ${getPlatformColor(post.platform)} text-xs rounded-full flex items-center space-x-1`}>
                    <span>{getPlatformIcon(post.platform)}</span>
                    <span>
                      {post.platform === 'instagram' ? 'Instagram' :
                       post.platform === 'youtube' ? 'YouTube' : post.platform}
                    </span>
                  </span>
                  
                  <span className={`px-2 py-1 ${getStatusColor(post.status)} text-xs rounded-full flex items-center space-x-1`}>
                    <StatusIcon className="w-3 h-3" />
                    <span>{post.status.charAt(0).toUpperCase() + post.status.slice(1)}</span>
                  </span>
                </div>
              </div>
              
              <button className="text-gray-400 hover:text-red-500 transition-colors p-2">
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