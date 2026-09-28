import React from 'react';
import VideoCard from './VideoCard';
import { Video } from '../store/video-store';

interface VideoGridProps {
  videos: Video[];
}

const VideoGrid: React.FC<VideoGridProps> = ({ videos }) => {
  const handleEdit = (video: Video) => {
    console.log('Edit video:', video.id);
    // In a real app, this would open an edit modal
  };

  const handleDelete = (videoId: string) => {
    console.log('Delete video:', videoId);
    // In a real app, this would show a confirmation dialog
  };

  const handleSchedule = (videoId: string) => {
    console.log('Schedule video:', videoId);
    // In a real app, this would navigate to schedule page
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {videos.map(video => (
        <VideoCard
          key={video.id}
          video={video}
          viewMode="grid"
          onEdit={handleEdit}
          onDelete={handleDelete}
          onSchedule={handleSchedule}
        />
      ))}
    </div>
  );
};

export default VideoGrid;