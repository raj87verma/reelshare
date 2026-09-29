import React, { useState } from 'react';
import { Upload, Clock, Loader2, FileVideo } from 'lucide-react';
import { useVideoStore } from '../store/video-store';

interface VideoUploadProps {
  onUploadComplete?: (videoId: string) => void;
  className?: string;
}

// Uses Electron's native "open file" dialog (via useVideoStore's
// pickAndUploadVideo) rather than an HTML <input type="file"> or
// drag-and-drop zone. Browser File objects handed to the renderer have no
// durable filesystem path once picked -- Electron 32+ removes the old
// nonstandard File.path extension entirely, and even on the currently
// pinned Electron 28 relying on it would break on any future upgrade.
// The native dialog hands back a real path directly, which is what lets
// the main process copy the video into permanent storage, run ffprobe on
// it, and generate a thumbnail.
const VideoUpload: React.FC<VideoUploadProps> = ({ onUploadComplete, className }) => {
  const { uploading, uploadProgress, pickAndUploadVideo } = useVideoStore();
  const [selectedTitle, setSelectedTitle] = useState('');
  const [selectedDescription, setSelectedDescription] = useState('');

  const handlePickAndUpload = async () => {
    const videoId = await pickAndUploadVideo({
      title: selectedTitle.trim() || undefined,
      description: selectedDescription.trim() || undefined
    });

    if (videoId) {
      setSelectedTitle('');
      setSelectedDescription('');
      if (onUploadComplete) {
        onUploadComplete(videoId);
      }
    }
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Optional metadata, applied to whichever file the user picks next */}
      <div className="space-y-4">
        <div>
          <label htmlFor="title" className="block text-sm font-medium text-foreground mb-2">
            Title <span className="text-muted-foreground font-normal">(optional — defaults to the file name)</span>
          </label>
          <input
            id="title"
            type="text"
            value={selectedTitle}
            onChange={(e) => setSelectedTitle(e.target.value)}
            className="w-full px-4 py-2 bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            placeholder="Enter video title"
            disabled={uploading}
          />
        </div>

        <div>
          <label htmlFor="description" className="block text-sm font-medium text-foreground mb-2">
            Description
          </label>
          <textarea
            id="description"
            value={selectedDescription}
            onChange={(e) => setSelectedDescription(e.target.value)}
            className="w-full px-4 py-2 bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary min-h-[100px] resize-none"
            placeholder="Enter video description (optional)"
            disabled={uploading}
          />
        </div>
      </div>

      {/* Pick + Upload */}
      <button
        onClick={handlePickAndUpload}
        disabled={uploading}
        className="w-full border-2 border-dashed rounded-lg p-8 text-center transition-colors border-border hover:border-primary/50 hover:bg-muted/50 disabled:opacity-70 disabled:cursor-not-allowed"
      >
        <div className="flex flex-col items-center justify-center space-y-4">
          <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
            {uploading ? (
              <Loader2 className="w-8 h-8 text-primary animate-spin" />
            ) : (
              <FileVideo className="w-8 h-8 text-primary" />
            )}
          </div>

          <div>
            <h3 className="text-lg font-medium text-foreground">
              {uploading ? 'Uploading...' : 'Choose a video to upload'}
            </h3>
            <p className="text-sm text-muted-foreground mt-1">
              {uploading ? `${uploadProgress}% complete` : 'Click to open the file picker'}
            </p>
          </div>

          {uploading && (
            <div className="w-full max-w-xs">
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          )}

          {!uploading && (
            <div className="text-xs text-muted-foreground">
              Supports MP4, MOV, AVI, MKV, WebM
            </div>
          )}
        </div>
      </button>

      {/* Quick Tips */}
      <div className="bg-muted/50 rounded-lg p-4">
        <h4 className="text-sm font-medium text-foreground mb-2">Quick Tips</h4>
        <ul className="space-y-2 text-sm text-muted-foreground">
          <li className="flex items-center space-x-2">
            <Upload className="w-4 h-4" />
            <span>Videos are copied into ReelShare's own storage, so the original file can be moved or deleted safely afterward</span>
          </li>
          <li className="flex items-center space-x-2">
            <Clock className="w-4 h-4" />
            <span>Upload during peak hours for maximum visibility</span>
          </li>
        </ul>
      </div>
    </div>
  );
};

export default VideoUpload;
