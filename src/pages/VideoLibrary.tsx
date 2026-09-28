import React, { useEffect, useState } from 'react';
import { Search, Filter, Grid, List, MoreVertical, Play, Upload } from 'lucide-react';
import VideoUpload from '../components/VideoUpload';
import VideoCard from '../components/VideoCard';
import VideoGrid from '../components/VideoGrid';
import { useVideoStore } from '../store/video-store';

const VideoLibrary: React.FC = () => {
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [filterPlatform, setFilterPlatform] = useState<string>('all');
  
  const { videos, loading, getVideos } = useVideoStore();

  useEffect(() => {
    getVideos();
  }, [getVideos]);

  const filteredVideos = videos.filter(video => {
    const matchesSearch = video.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         video.description.toLowerCase().includes(searchQuery.toLowerCase());
    
    // In a real app, this would filter by platform
    const matchesPlatform = filterPlatform === 'all' || true;
    
    return matchesSearch && matchesPlatform;
  });

  const platforms = [
    { id: 'all', name: 'All Platforms' },
    { id: 'instagram', name: 'Instagram' },
    { id: 'tiktok', name: 'TikTok' },
    { id: 'youtube', name: 'YouTube' },
    { id: 'facebook', name: 'Facebook' },
  ];

  const handleUploadComplete = (videoId: string) => {
    setShowUploadModal(false);
    console.log('Upload complete:', videoId);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Video Library</h2>
          <p className="text-muted-foreground mt-1">
            {videos.length} videos • {filteredVideos.length} filtered
          </p>
        </div>
        
        <div className="flex items-center space-x-3">
          <button
            onClick={() => setShowUploadModal(true)}
            className="bg-primary text-primary-foreground font-medium py-2 px-4 rounded-lg hover:bg-primary/90 transition-colors flex items-center space-x-2"
          >
            <Upload className="w-4 h-4" />
            <span>Upload Video</span>
          </button>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-card border border-border rounded-xl p-4">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Search */}
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search videos by title or description..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
            </div>
          </div>

          {/* Platform Filter */}
          <div className="w-full md:w-48">
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <select
                value={filterPlatform}
                onChange={(e) => setFilterPlatform(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary appearance-none"
              >
                {platforms.map(platform => (
                  <option key={platform.id} value={platform.id}>
                    {platform.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* View Toggle */}
          <div className="flex items-center space-x-1">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded-lg transition-colors ${
                viewMode === 'grid'
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-muted'
              }`}
            >
              <Grid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded-lg transition-colors ${
                viewMode === 'list'
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-muted'
              }`}
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-background rounded-xl shadow-lg max-w-2xl w-full max-h-[90vh] overflow-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-foreground">Upload Video</h3>
                <button
                  onClick={() => setShowUploadModal(false)}
                  className="p-2 hover:bg-muted rounded-lg transition-colors"
                >
                  <MoreVertical className="w-5 h-5 text-muted-foreground" />
                </button>
              </div>
              <VideoUpload onUploadComplete={handleUploadComplete} />
            </div>
          </div>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-muted-foreground">Loading videos...</p>
          </div>
        </div>
      )}

      {/* Empty State */}
      {!loading && filteredVideos.length === 0 && (
        <div className="bg-card border border-border rounded-xl p-12 text-center">
          <div className="w-20 h-20 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
            <Play className="w-10 h-10 text-muted-foreground" />
          </div>
          <h3 className="text-xl font-medium text-foreground mb-2">No videos found</h3>
          <p className="text-muted-foreground mb-6">
            {searchQuery ? 'Try a different search term' : 'Upload your first video to get started'}
          </p>
          <button
            onClick={() => setShowUploadModal(true)}
            className="bg-primary text-primary-foreground font-medium py-2 px-6 rounded-lg hover:bg-primary/90 transition-colors inline-flex items-center space-x-2"
          >
            <Upload className="w-4 h-4" />
            <span>Upload Video</span>
          </button>
        </div>
      )}

      {/* Video Grid/List */}
      {!loading && filteredVideos.length > 0 && (
        <div className={viewMode === 'grid' ? '' : 'space-y-4'}>
          {viewMode === 'grid' ? (
            <VideoGrid videos={filteredVideos} />
          ) : (
            <div className="space-y-4">
              {filteredVideos.map(video => (
                <VideoCard key={video.id} video={video} viewMode="list" />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Stats */}
      {!loading && filteredVideos.length > 0 && (
        <div className="bg-muted/50 rounded-lg p-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-foreground">{videos.length}</p>
              <p className="text-sm text-muted-foreground">Total Videos</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-foreground">
                {Math.round(videos.reduce((acc, v) => acc + v.durationSeconds, 0) / 60)}
              </p>
              <p className="text-sm text-muted-foreground">Total Minutes</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-foreground">
                {Math.round(videos.reduce((acc, v) => acc + v.metadata.size, 0) / (1024 * 1024))}
              </p>
              <p className="text-sm text-muted-foreground">Total Size (MB)</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-foreground">
                {videos.filter(v => v.metadata.hasAudio).length}
              </p>
              <p className="text-sm text-muted-foreground">With Audio</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default VideoLibrary;