import React from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import VideoCard from './VideoCard';
import { Video, useVideoStore } from '../store/video-store';

interface VideoGridProps {
  videos: Video[];
}

const VideoGrid: React.FC<VideoGridProps> = ({ videos }) => {
  const navigate = useNavigate();
  const { deleteVideo } = useVideoStore();

  const handleEdit = (_video: Video) => {
    // Video editing (trim/compress/watermark) isn't available from the UI
    // yet -- video-store.ts's processVideo()/compressVideo() both
    // deliberately throw "not yet available" rather than silently doing
    // nothing, so surface that here too instead of a no-op console.log.
    toast.info('Video editing is not available yet', {
      description: 'Trim, compress, and watermark tools are coming in a future update.'
    });
  };

  const handleDelete = async (videoId: string) => {
    const video = videos.find(v => v.id === videoId);
    if (!window.confirm(`Delete "${video?.title || 'this video'}"? This also removes the video file from disk and cannot be undone.`)) {
      return;
    }
    await deleteVideo(videoId);
  };

  // Navigates to the Schedule page and opens its "Schedule New Post" form
  // pre-filled with this video, via router state -- Schedule.tsx reads
  // location.state.openScheduleForVideoId on mount. Previously this only
  // called console.log('Schedule video:', videoId) and did nothing visible
  // at all, which is the "no option to schedule a video" bug reported.
  const handleSchedule = (videoId: string) => {
    navigate('/schedule', { state: { openScheduleForVideoId: videoId } });
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