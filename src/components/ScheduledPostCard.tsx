import React, { useState } from 'react';
import { Clock, Calendar, Check, X, Upload, AlertCircle, MoreVertical, RefreshCw, ExternalLink } from 'lucide-react';
import { ScheduledPost, getTimeRemaining, getStatusColor, getStatusIcon } from '../store/schedule-store';

interface ScheduledPostCardProps {
  post: ScheduledPost;
  onCancel: (postId: string) => void;
  onReschedule: (postId: string, newTime: Date) => void;
  showDate?: boolean;
}

const ScheduledPostCard: React.FC<ScheduledPostCardProps> = ({
  post,
  onCancel,
  onReschedule,
  showDate = true
}) => {
  const [showActions, setShowActions] = useState(false);
  const [isEditingTime, setIsEditingTime] = useState(false);
  const [newTime, setNewTime] = useState(
    post.scheduledTime.toTimeString().slice(0, 5)
  );

  const StatusIcon = getStatusIcon(post.status);
  const timeRemaining = getTimeRemaining(post.scheduledTime);
  const isPast = post.scheduledTime < new Date();

  const handleReschedule = () => {
    const [hours, minutes] = newTime.split(':').map(Number);
    const newDate = new Date(post.scheduledTime);
    newDate.setHours(hours, minutes);
    
    if (newDate.getTime() !== post.scheduledTime.getTime()) {
      onReschedule(post.id, newDate);
      setIsEditingTime(false);
    }
  };

  const formatPlatformIcon = (platform: string) => {
    switch (platform) {
      case 'instagram':
        return '📷';
      case 'tiktok':
        return '🎵';
      case 'youtube':
        return '📺';
      default:
        return '🔗';
    }
  };

  const getPlatformColor = (platform: string) => {
    switch (platform) {
      case 'instagram':
        return 'bg-gradient-to-r from-purple-500 to-pink-500';
      case 'tiktok':
        return 'bg-black';
      case 'youtube':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  return (
    <div className="bg-card border border-border rounded-xl p-4 hover:border-primary/30 transition-colors">
      <div className="flex items-start justify-between">
        {/* Left Side - Video Info */}
        <div className="flex items-start space-x-3 flex-1">
          {/* Thumbnail */}
          <div className="w-16 h-16 bg-muted rounded-lg overflow-hidden flex-shrink-0">
            {post.videoThumbnail ? (
              <div 
                className="w-full h-full bg-cover bg-center"
                style={{ backgroundImage: `url(${post.videoThumbnail})` }}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <span className="text-2xl">{formatPlatformIcon(post.platform)}</span>
              </div>
            )}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between">
              <div>
                <h4 className="font-medium text-foreground truncate">{post.videoTitle}</h4>
                <div className="flex items-center space-x-2 mt-1">
                  <div className={`px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(post.status)} flex items-center space-x-1`}>
                    <StatusIcon className="w-3 h-3" />
                    <span>{post.status.charAt(0).toUpperCase() + post.status.slice(1)}</span>
                  </div>
                  
                  <div className="flex items-center space-x-1 text-sm text-muted-foreground">
                    <div className={`w-6 h-6 rounded flex items-center justify-center ${getPlatformColor(post.platform)} text-white text-xs`}>
                      {formatPlatformIcon(post.platform)}
                    </div>
                    <span>{post.accountName}</span>
                  </div>
                </div>
              </div>

              {/* Actions Button */}
              <div className="relative">
                <button
                  onClick={() => setShowActions(!showActions)}
                  className="p-1 hover:bg-muted rounded-lg transition-colors"
                >
                  <MoreVertical className="w-4 h-4 text-muted-foreground" />
                </button>
                
                {showActions && (
                  <div className="absolute right-0 top-full mt-1 w-48 bg-background border border-border rounded-lg shadow-lg z-10">
                    <div className="py-1">
                      {post.status === 'pending' && (
                        <>
                          <button
                            onClick={() => {
                              setIsEditingTime(true);
                              setShowActions(false);
                            }}
                            className="w-full text-left px-4 py-2 text-sm hover:bg-muted transition-colors flex items-center space-x-2"
                          >
                            <RefreshCw className="w-3.5 h-3.5" />
                            <span>Reschedule</span>
                          </button>
                          <button
                            onClick={() => onCancel(post.id)}
                            className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors flex items-center space-x-2"
                          >
                            <X className="w-3.5 h-3.5" />
                            <span>Cancel</span>
                          </button>
                        </>
                      )}
                      
                      {post.status === 'published' && post.platformPostId && (
                        <button
                          onClick={() => {
                            // In a real app, this would open the post URL
                            console.log('Opening post:', post.platformPostId);
                          }}
                          className="w-full text-left px-4 py-2 text-sm hover:bg-muted transition-colors flex items-center space-x-2"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          <span>View Post</span>
                        </button>
                      )}
                      
                      {post.status === 'failed' && (
                        <button
                          onClick={() => {
                            // In a real app, this would retry publishing
                            console.log('Retrying post:', post.id);
                          }}
                          className="w-full text-left px-4 py-2 text-sm hover:bg-muted transition-colors flex items-center space-x-2"
                        >
                          <RefreshCw className="w-3.5 h-3.5" />
                          <span>Retry</span>
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Caption and Hashtags */}
            {post.caption && (
              <p className="text-sm text-foreground mt-2 line-clamp-2">
                {post.caption}
              </p>
            )}
            
            {post.hashtags && post.hashtags.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {post.hashtags.slice(0, 3).map((tag, index) => (
                  <span key={index} className="text-xs text-primary bg-primary/10 px-2 py-0.5 rounded">
                    {tag.startsWith('#') ? tag : `#${tag}`}
                  </span>
                ))}
                {post.hashtags.length > 3 && (
                  <span className="text-xs text-muted-foreground">
                    +{post.hashtags.length - 3} more
                  </span>
                )}
              </div>
            )}

            {/* Error Message */}
            {post.status === 'failed' && post.errorMessage && (
              <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-xs text-red-600">
                <AlertCircle className="w-3 h-3 inline mr-1" />
                {post.errorMessage}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Bottom Bar - Time and Date */}
      <div className="flex items-center justify-between mt-4 pt-4 border-t border-border">
        <div className="flex items-center space-x-4 text-sm text-muted-foreground">
          <div className="flex items-center space-x-1">
            <Calendar className="w-4 h-4" />
            {showDate ? (
              <span>
                {post.scheduledTime.toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric'
                })}
              </span>
            ) : (
              <span>
                {post.scheduledTime.toLocaleDateString('en-US', {
                  weekday: 'short',
                  month: 'short',
                  day: 'numeric'
                })}
              </span>
            )}
          </div>
          
          <div className="flex items-center space-x-1">
            <Clock className="w-4 h-4" />
            {isEditingTime ? (
              <div className="flex items-center space-x-2">
                <input
                  type="time"
                  value={newTime}
                  onChange={(e) => setNewTime(e.target.value)}
                  className="px-2 py-1 border border-input rounded text-sm"
                />
                <button
                  onClick={handleReschedule}
                  className="px-2 py-1 bg-primary text-primary-foreground text-xs rounded hover:bg-primary/90"
                >
                  Save
                </button>
                <button
                  onClick={() => setIsEditingTime(false)}
                  className="px-2 py-1 border border-input text-xs rounded hover:bg-muted"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <span>
                {post.scheduledTime.toLocaleTimeString('en-US', {
                  hour: 'numeric',
                  minute: '2-digit'
                })}
              </span>
            )}
          </div>
        </div>

        {/* Time Remaining / Status Info */}
        <div className="text-sm">
          {post.status === 'pending' && !isPast && (
            <div className="flex items-center space-x-1 text-blue-600">
              <Clock className="w-4 h-4" />
              <span>In {timeRemaining}</span>
            </div>
          )}
          
          {post.status === 'pending' && isPast && (
            <div className="flex items-center space-x-1 text-yellow-600">
              <AlertCircle className="w-4 h-4" />
              <span>Overdue</span>
            </div>
          )}
          
          {post.status === 'processing' && (
            <div className="flex items-center space-x-1 text-yellow-600">
              <Upload className="w-4 h-4 animate-pulse" />
              <span>Publishing...</span>
            </div>
          )}
          
          {post.status === 'published' && post.publishedTime && (
            <div className="flex items-center space-x-1 text-green-600">
              <Check className="w-4 h-4" />
              <span>
                {post.publishedTime.toLocaleTimeString('en-US', {
                  hour: 'numeric',
                  minute: '2-digit'
                })}
              </span>
            </div>
          )}
          
          {post.status === 'failed' && (
            <div className="flex items-center space-x-1 text-red-600">
              <AlertCircle className="w-4 h-4" />
              <span>Failed</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ScheduledPostCard;