import React from 'react';
import { Play, Calendar, Clock, MoreVertical, ExternalLink, Trash2, Edit } from 'lucide-react';
import { Video } from '../store/video-store';
import { formatDuration, formatFileSize } from '../store/video-store';

interface VideoCardProps {
  video: Video;
  viewMode?: 'grid' | 'list';
  onEdit?: (video: Video) => void;
  onDelete?: (videoId: string) => void;
  onSchedule?: (videoId: string) => void;
}

const VideoCard: React.FC<VideoCardProps> = ({ 
  video, 
  viewMode = 'grid',
  onEdit,
  onDelete,
  onSchedule 
}) => {
  const handleEdit = () => {
    if (onEdit) onEdit(video);
  };

  const handleDelete = () => {
    if (onDelete) onDelete(video.id);
  };

  const handleSchedule = () => {
    if (onSchedule) onSchedule(video.id);
  };

  if (viewMode === 'list') {
    return (
      <div className="bg-card border border-border rounded-xl p-4 hover:border-primary/50 transition-colors">
        <div className="flex items-start gap-4">
          {/* Thumbnail */}
          <div className="relative w-32 h-24 bg-muted rounded-lg overflow-hidden flex-shrink-0">
            <div className="absolute inset-0 flex items-center justify-center">
              <Play className="w-8 h-8 text-white/70" />
            </div>
            {video.thumbnailPath && (
              <div 
                className="absolute inset-0 bg-cover bg-center"
                style={{ backgroundImage: `url(${video.thumbnailPath})` }}
              />
            )}
            <div className="absolute bottom-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded">
              {formatDuration(video.durationSeconds)}
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-medium text-foreground truncate">{video.title}</h3>
                {video.description && (
                  <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                    {video.description}
                  </p>
                )}
              </div>
              
              <div className="relative">
                <button className="p-2 hover:bg-muted rounded-lg transition-colors">
                  <MoreVertical className="w-4 h-4 text-muted-foreground" />
                </button>
              </div>
            </div>

            {/* Metadata */}
            <div className="flex items-center gap-4 mt-3 text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                <Clock className="w-4 h-4" />
                <span>{formatDuration(video.durationSeconds)}</span>
              </div>
              <div>
                <span>{video.metadata.width}×{video.metadata.height}</span>
              </div>
              <div>
                <span>{formatFileSize(video.metadata.size)}</span>
              </div>
              <div>
                <span>{video.metadata.frameRate} FPS</span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 mt-4">
              <button
                onClick={handleSchedule}
                className="inline-flex items-center gap-2 px-3 py-1.5 bg-primary/10 text-primary text-sm font-medium rounded-lg hover:bg-primary/20 transition-colors"
              >
                <Calendar className="w-3.5 h-3.5" />
                <span>Schedule</span>
              </button>
              
              <button
                onClick={handleEdit}
                className="inline-flex items-center gap-2 px-3 py-1.5 bg-muted text-foreground text-sm font-medium rounded-lg hover:bg-muted/80 transition-colors"
              >
                <Edit className="w-3.5 h-3.5" />
                <span>Edit</span>
              </button>
              
              <button
                onClick={handleDelete}
                className="inline-flex items-center gap-2 px-3 py-1.5 bg-destructive/10 text-destructive text-sm font-medium rounded-lg hover:bg-destructive/20 transition-colors ml-auto"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Grid view
  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden hover:border-primary/50 transition-colors group">
      {/* Thumbnail */}
      <div className="relative aspect-video bg-muted overflow-hidden">
        <div className="absolute inset-0 flex items-center justify-center group-hover:scale-105 transition-transform duration-300">
          <div className="w-16 h-16 bg-black/50 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
            <Play className="w-8 h-8 text-white" />
          </div>
        </div>
        {video.thumbnailPath && (
          <div 
            className="absolute inset-0 bg-cover bg-center group-hover:scale-105 transition-transform duration-300"
            style={{ backgroundImage: `url(${video.thumbnailPath})` }}
          />
        )}
        <div className="absolute top-3 right-3 bg-black/70 text-white text-xs px-2 py-1 rounded">
          {formatDuration(video.durationSeconds)}
        </div>
        
        {/* Quick Actions Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
          <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between">
            <button
              onClick={handleSchedule}
              className="bg-primary text-primary-foreground text-sm font-medium px-3 py-1.5 rounded-lg hover:bg-primary/90 transition-colors flex items-center gap-2"
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>Schedule</span>
            </button>
            
            <button className="bg-white/10 backdrop-blur-sm text-white p-2 rounded-lg hover:bg-white/20 transition-colors">
              <ExternalLink className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        <div className="flex items-start justify-between mb-2">
          <h3 className="font-medium text-foreground truncate flex-1">{video.title}</h3>
          
          <div className="relative">
            <button className="p-1 hover:bg-muted rounded-lg transition-colors">
              <MoreVertical className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>
        </div>

        {video.description && (
          <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
            {video.description}
          </p>
        )}

        {/* Metadata */}
        <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            <span>{formatDuration(video.durationSeconds)}</span>
          </div>
          <div>
            <span>{video.metadata.width}×{video.metadata.height}</span>
          </div>
          <div>
            <span>{formatFileSize(video.metadata.size)}</span>
          </div>
          <div>
            <span>{video.metadata.frameRate} FPS</span>
          </div>
        </div>

        {/* Created Date */}
        <div className="mt-3 pt-3 border-t border-border text-xs text-muted-foreground">
          Uploaded {video.createdAt.toLocaleDateString()}
        </div>
      </div>
    </div>
  );
};

export default VideoCard;