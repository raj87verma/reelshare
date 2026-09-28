import React, { useState, useEffect } from 'react';
import { X, Calendar, Clock, Hash, Globe, Check } from 'lucide-react';
import { Video as VideoType } from '../store/video-store';
import { PlatformConnection } from '../store/social-accounts-store';

interface ScheduleFormProps {
  videos: VideoType[];
  platforms: PlatformConnection[];
  onSubmit: (data: any) => void;
  onCancel: () => void;
  initialVideoId?: string | null;
}

const ScheduleForm: React.FC<ScheduleFormProps> = ({
  videos,
  platforms,
  onSubmit,
  onCancel,
  initialVideoId
}) => {
  const [selectedVideo, setSelectedVideo] = useState<string>(initialVideoId || '');
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([]);
  const [date, setDate] = useState<string>('');
  const [time, setTime] = useState<string>('09:00');
  const [caption, setCaption] = useState<string>('');
  const [hashtags, setHashtags] = useState<string>('');
  const [options, setOptions] = useState({
    isReel: false,
    isStory: false,
    visibility: 'public'
  });
  const [step, setStep] = useState<number>(1);

  useEffect(() => {
    // Set default date to tomorrow
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    setDate(tomorrow.toISOString().split('T')[0]);
  }, []);

  useEffect(() => {
    if (initialVideoId) {
      setSelectedVideo(initialVideoId);
      const video = videos.find(v => v.id === initialVideoId);
      if (video) {
        setCaption(video.title);
      }
    }
  }, [initialVideoId, videos]);

  const handlePlatformToggle = (platformId: string) => {
    setSelectedPlatforms(prev => {
      if (prev.includes(platformId)) {
        return prev.filter(id => id !== platformId);
      } else {
        return [...prev, platformId];
      }
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedVideo) {
      alert('Please select a video');
      return;
    }
    
    if (selectedPlatforms.length === 0) {
      alert('Please select at least one platform');
      return;
    }
    
    if (!date || !time) {
      alert('Please select date and time');
      return;
    }
    
    const scheduledTime = new Date(`${date}T${time}`);
    
    const formData = {
      videoId: selectedVideo,
      platformIds: selectedPlatforms,
      scheduledTime,
      caption: caption.trim(),
      hashtags: hashtags.split(',').map(tag => tag.trim()).filter(tag => tag),
      options
    };
    
    onSubmit(formData);
  };

  const getSelectedVideo = () => {
    return videos.find(v => v.id === selectedVideo);
  };

  const renderStep1 = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-foreground mb-4">Select Video</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {videos.map(video => (
            <button
              key={video.id}
              type="button"
              onClick={() => setSelectedVideo(video.id)}
              className={`
                p-4 border rounded-lg text-left transition-colors
                ${selectedVideo === video.id 
                  ? 'border-primary bg-primary/10' 
                  : 'border-border hover:border-primary/50 hover:bg-muted/50'
                }
              `}
            >
              <div className="flex items-start space-x-3">
                <div className="w-16 h-16 bg-muted rounded-lg overflow-hidden flex-shrink-0">
                  {selectedVideo === video.id && (
                    <div className="w-full h-full bg-primary/20 flex items-center justify-center">
                      <Check className="w-6 h-6 text-primary" />
                    </div>
                  )}
                </div>
                <div className="flex-1">
                  <h4 className="font-medium text-foreground truncate">{video.title}</h4>
                  <p className="text-sm text-muted-foreground mt-1">
                    {Math.round(video.durationSeconds / 60)} min • {video.metadata.width}×{video.metadata.height}
                  </p>
                  <p className="text-xs text-muted-foreground mt-2">
                    {new Date(video.createdAt).toLocaleDateString()}
                  </p>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      <div className="flex justify-between">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 border border-border rounded-lg hover:bg-muted transition-colors"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={() => setStep(2)}
          disabled={!selectedVideo}
          className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Next: Select Platforms
        </button>
      </div>
    </div>
  );

  const renderStep2 = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-foreground mb-4">Select Platforms</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Choose which platforms to publish to
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {platforms.map(platform => (
            <button
              key={platform.id}
              type="button"
              onClick={() => handlePlatformToggle(platform.id)}
              disabled={!platform.connected}
              className={`
                p-4 border rounded-lg text-left transition-colors
                ${selectedPlatforms.includes(platform.id) 
                  ? 'border-primary bg-primary/10' 
                  : 'border-border hover:border-primary/50 hover:bg-muted/50'
                }
                ${!platform.connected ? 'opacity-50 cursor-not-allowed' : ''}
              `}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                    platform.id === 'instagram' ? 'bg-gradient-to-r from-purple-500 to-pink-500' :
                    platform.id === 'tiktok' ? 'bg-black' :
                    platform.id === 'youtube' ? 'bg-red-500' : 'bg-gray-500'
                  }`}>
                    <span className="text-white">
                      {platform.id === 'instagram' ? '📷' :
                       platform.id === 'tiktok' ? '🎵' :
                       platform.id === 'youtube' ? '📺' : '🔗'}
                    </span>
                  </div>
                  <div>
                    <h4 className="font-medium text-foreground">{platform.name}</h4>
                    <p className="text-sm text-muted-foreground">
                      {platform.connected ? `@${platform.username}` : 'Not connected'}
                    </p>
                  </div>
                </div>
                {selectedPlatforms.includes(platform.id) && (
                  <Check className="w-5 h-5 text-primary" />
                )}
              </div>
            </button>
          ))}
        </div>
      </div>

      <div className="flex justify-between">
        <button
          type="button"
          onClick={() => setStep(1)}
          className="px-4 py-2 border border-border rounded-lg hover:bg-muted transition-colors"
        >
          Back
        </button>
        <button
          type="button"
          onClick={() => setStep(3)}
          disabled={selectedPlatforms.length === 0}
          className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Next: Schedule Time
        </button>
      </div>
    </div>
  );

  const renderStep3 = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-foreground mb-4">Schedule Time</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              <div className="flex items-center space-x-2">
                <Calendar className="w-4 h-4" />
                <span>Date</span>
              </div>
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              min={new Date().toISOString().split('T')[0]}
              className="w-full px-4 py-2 bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              <div className="flex items-center space-x-2">
                <Clock className="w-4 h-4" />
                <span>Time</span>
              </div>
            </label>
            <input
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              className="w-full px-4 py-2 bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              required
            />
          </div>
        </div>
        
        <div className="mt-6">
          <h4 className="text-sm font-medium text-foreground mb-2">Quick Schedule</h4>
          <div className="flex flex-wrap gap-2">
            {['09:00', '12:00', '15:00', '18:00', '21:00'].map(suggestedTime => (
              <button
                key={suggestedTime}
                type="button"
                onClick={() => setTime(suggestedTime)}
                className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                  time === suggestedTime
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-foreground hover:bg-muted/80'
                }`}
              >
                {suggestedTime}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="flex justify-between">
        <button
          type="button"
          onClick={() => setStep(2)}
          className="px-4 py-2 border border-border rounded-lg hover:bg-muted transition-colors"
        >
          Back
        </button>
        <button
          type="button"
          onClick={() => setStep(4)}
          disabled={!date || !time}
          className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Next: Content Details
        </button>
      </div>
    </div>
  );

  const renderStep4 = () => {
    const selectedVideoData = getSelectedVideo();
    const scheduledDateTime = new Date(`${date}T${time}`);
    
    return (
      <div className="space-y-6">
        <div>
          <h3 className="text-lg font-semibold text-foreground mb-4">Content Details</h3>
          
          <div className="mb-6 p-4 bg-muted/50 rounded-lg">
            <h4 className="font-medium text-foreground mb-2">Schedule Summary</h4>
            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Video:</span>
                <span className="font-medium">{selectedVideoData?.title || 'No video selected'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Platforms:</span>
                <span className="font-medium">
                  {selectedPlatforms.map(id => 
                    platforms.find(p => p.id === id)?.name
                  ).join(', ')}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Scheduled for:</span>
                <span className="font-medium">
                  {scheduledDateTime.toLocaleDateString('en-US', {
                    weekday: 'short',
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric'
                  })}
                  {' at '}
                  {scheduledDateTime.toLocaleTimeString('en-US', {
                    hour: 'numeric',
                    minute: '2-digit'
                  })}
                </span>
              </div>
            </div>
          </div>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Caption
              </label>
              <textarea
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                placeholder="Write your post caption here..."
                className="w-full px-4 py-2 bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary min-h-[100px] resize-none"
                maxLength={2200}
              />
              <div className="text-xs text-muted-foreground mt-1 text-right">
                {caption.length}/2200 characters
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                <div className="flex items-center space-x-2">
                  <Hash className="w-4 h-4" />
                  <span>Hashtags</span>
                </div>
              </label>
              <input
                type="text"
                value={hashtags}
                onChange={(e) => setHashtags(e.target.value)}
                placeholder="travel, adventure, vlog (separate with commas)"
                className="w-full px-4 py-2 bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
              <div className="text-xs text-muted-foreground mt-1">
                Separate hashtags with commas. First 3-5 hashtags work best.
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                <div className="flex items-center space-x-2">
                  <Globe className="w-4 h-4" />
                  <span>Post Options</span>
                </div>
              </label>
              <div className="space-y-2">
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={options.isReel}
                    onChange={(e) => setOptions({ ...options, isReel: e.target.checked })}
                    className="rounded border-input"
                  />
                  <span className="text-sm">Post as Instagram Reel</span>
                </label>
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={options.isStory}
                    onChange={(e) => setOptions({ ...options, isStory: e.target.checked })}
                    className="rounded border-input"
                  />
                  <span className="text-sm">Also post to Stories</span>
                </label>
                <div className="flex items-center space-x-4">
                  <span className="text-sm">Visibility:</span>
                  <select
                    value={options.visibility}
                    onChange={(e) => setOptions({ ...options, visibility: e.target.value })}
                    className="px-3 py-1 bg-background border border-input rounded-lg text-sm"
                  >
                    <option value="public">Public</option>
                    <option value="private">Private</option>
                    <option value="friends">Friends Only</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-between">
          <button
            type="button"
            onClick={() => setStep(3)}
            className="px-4 py-2 border border-border rounded-lg hover:bg-muted transition-colors"
          >
            Back
          </button>
          <div className="space-x-3">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 border border-border rounded-lg hover:bg-muted transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              onClick={handleSubmit}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
            >
              Schedule Post
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-foreground">Schedule New Post</h2>
        <button
          onClick={onCancel}
          className="p-2 hover:bg-muted rounded-lg transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Progress Steps */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          {[1, 2, 3, 4].map((stepNumber) => (
            <div key={stepNumber} className="flex flex-col items-center">
              <div className={`
                w-8 h-8 rounded-full flex items-center justify-center mb-2
                ${step >= stepNumber 
                  ? 'bg-primary text-primary-foreground' 
                  : 'bg-muted text-muted-foreground'
                }
              `}>
                {stepNumber}
              </div>
              <span className="text-xs font-medium">
                {stepNumber === 1 && 'Video'}
                {stepNumber === 2 && 'Platforms'}
                {stepNumber === 3 && 'Time'}
                {stepNumber === 4 && 'Details'}
              </span>
            </div>
          ))}
        </div>
        <div className="relative mt-4">
          <div className="absolute top-0 left-0 right-0 h-0.5 bg-muted"></div>
          <div 
            className="absolute top-0 left-0 h-0.5 bg-primary transition-all duration-300"
            style={{ width: `${((step - 1) / 3) * 100}%` }}
          ></div>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        {step === 1 && renderStep1()}
        {step === 2 && renderStep2()}
        {step === 3 && renderStep3()}
        {step === 4 && renderStep4()}
      </form>
    </div>
  );
};

export default ScheduleForm;