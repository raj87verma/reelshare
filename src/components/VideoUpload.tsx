import React, { useState, useCallback } from 'react';
import { Upload, X, Video, Clock, FileVideo, Loader2 } from 'lucide-react';
import { useVideoStore } from '../store/video-store';
import { toast } from 'sonner';

interface VideoUploadProps {
  onUploadComplete?: (videoId: string) => void;
  className?: string;
}

const VideoUpload: React.FC<VideoUploadProps> = ({ onUploadComplete, className }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [metadata, setMetadata] = useState<{
    title: string;
    description: string;
  }>({
    title: '',
    description: ''
  });
  
  const { uploadVideo } = useVideoStore();

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      const file = files[0];
      if (file.type.startsWith('video/')) {
        handleFileSelect(file);
      } else {
        toast.error('Please select a video file');
      }
    }
  }, []);

  const handleFileSelect = (file: File) => {
    setSelectedFile(file);
    setMetadata({
      title: file.name.replace(/\.[^/.]+$/, ''), // Remove extension
      description: ''
    });
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    setUploading(true);
    setUploadProgress(0);

    try {
      // Simulate progress
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 10;
        });
      }, 200);

      const videoId = await uploadVideo(selectedFile, metadata);
      
      clearInterval(progressInterval);
      setUploadProgress(100);
      
      toast.success('Video uploaded successfully');
      
      if (onUploadComplete) {
        onUploadComplete(videoId);
      }
      
      // Reset form
      setSelectedFile(null);
      setMetadata({ title: '', description: '' });
      
    } catch (error) {
      toast.error('Failed to upload video');
      console.error('Upload error:', error);
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const removeFile = () => {
    setSelectedFile(null);
    setMetadata({ title: '', description: '' });
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {!selectedFile ? (
        <div
          className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer ${
            isDragging
              ? 'border-primary bg-primary/5'
              : 'border-border hover:border-primary/50 hover:bg-muted/50'
          }`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => document.getElementById('file-input')?.click()}
        >
          <input
            id="file-input"
            type="file"
            accept="video/*"
            className="hidden"
            onChange={handleFileInput}
          />
          
          <div className="flex flex-col items-center justify-center space-y-4">
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
              <Upload className="w-8 h-8 text-primary" />
            </div>
            
            <div>
              <h3 className="text-lg font-medium text-foreground">
                {isDragging ? 'Drop video here' : 'Upload your video'}
              </h3>
              <p className="text-sm text-muted-foreground mt-1">
                Drag and drop or click to browse
              </p>
            </div>
            
            <div className="text-xs text-muted-foreground">
              Supports MP4, MOV, AVI, MKV up to 2GB
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {/* File Preview */}
          <div className="border border-border rounded-lg p-4 bg-card">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                  <FileVideo className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h4 className="font-medium text-foreground">{selectedFile.name}</h4>
                  <div className="flex items-center space-x-4 text-sm text-muted-foreground mt-1">
                    <span>{formatFileSize(selectedFile.size)}</span>
                    <span>•</span>
                    <span>{selectedFile.type}</span>
                  </div>
                </div>
              </div>
              
              <button
                onClick={removeFile}
                className="p-2 hover:bg-muted rounded-lg transition-colors"
                disabled={uploading}
              >
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>
            
            {/* Progress Bar */}
            {uploading && (
              <div className="mt-4">
                <div className="flex items-center justify-between text-sm mb-1">
                  <span className="text-muted-foreground">Uploading...</span>
                  <span className="font-medium">{uploadProgress}%</span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary transition-all duration-300"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
              </div>
            )}
          </div>
          
          {/* Metadata Form */}
          <div className="space-y-4">
            <div>
              <label htmlFor="title" className="block text-sm font-medium text-foreground mb-2">
                Title
              </label>
              <input
                id="title"
                type="text"
                value={metadata.title}
                onChange={(e) => setMetadata(prev => ({ ...prev, title: e.target.value }))}
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
                value={metadata.description}
                onChange={(e) => setMetadata(prev => ({ ...prev, description: e.target.value }))}
                className="w-full px-4 py-2 bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary min-h-[100px] resize-none"
                placeholder="Enter video description (optional)"
                disabled={uploading}
              />
            </div>
          </div>
          
          {/* Upload Button */}
          <button
            onClick={handleUpload}
            disabled={uploading || !metadata.title.trim()}
            className="w-full bg-primary text-primary-foreground font-medium py-3 px-4 rounded-lg hover:bg-primary/90 transition-colors flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {uploading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Uploading...</span>
              </>
            ) : (
              <>
                <Upload className="w-5 h-5" />
                <span>Upload Video</span>
              </>
            )}
          </button>
        </div>
      )}
      
      {/* Quick Tips */}
      <div className="bg-muted/50 rounded-lg p-4">
        <h4 className="text-sm font-medium text-foreground mb-2">Quick Tips</h4>
        <ul className="space-y-2 text-sm text-muted-foreground">
          <li className="flex items-center space-x-2">
            <Video className="w-4 h-4" />
            <span>Keep videos under 60 seconds for best engagement</span>
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