import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Calendar, Clock, Filter, Upload, Check, AlertCircle } from 'lucide-react';
import ScheduleCalendar from '../components/ScheduleCalendar';
import ScheduleForm from '../components/ScheduleForm';
import ScheduledPostCard from '../components/ScheduledPostCard';
import { useScheduleStore } from '../store/schedule-store';
import { useVideoStore } from '../store/video-store';
import { useSocialAccountsStore } from '../store/social-accounts-store';

const Schedule: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [showScheduleForm, setShowScheduleForm] = useState(false);
  const [selectedVideo, setSelectedVideo] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  
  const { 
    scheduledPosts, 
    loading, 
    getScheduledPosts,
    createScheduledPost,
    updateScheduledPost,
    deleteScheduledPost 
  } = useScheduleStore();
  
  const { videos, getVideos } = useVideoStore();
  const { platforms, getPlatforms } = useSocialAccountsStore();

  useEffect(() => {
    getScheduledPosts();
    getVideos();
    getPlatforms();
  }, [getScheduledPosts, getVideos, getPlatforms]);

  // If we were navigated here from a video card's "Schedule" button (with
  // { state: { openScheduleForVideoId } }), open the schedule form
  // pre-filled with that video right away, and clear the navigation state
  // so it doesn't reopen on subsequent visits to this page.
  useEffect(() => {
    const videoId = (location.state as { openScheduleForVideoId?: string } | null)?.openScheduleForVideoId;
    if (videoId) {
      setSelectedVideo(videoId);
      setShowScheduleForm(true);
      navigate(location.pathname, { replace: true, state: null });
    }
  }, [location.state, location.pathname, navigate]);

  const handleDateSelect = (date: Date) => {
    setSelectedDate(date);
  };

  const handleScheduleSubmit = async (data: any) => {
    try {
      await createScheduledPost(data);
      setShowScheduleForm(false);
      setSelectedVideo(null);
    } catch (error) {
      console.error('Failed to schedule post:', error);
    }
  };

  const handleCancelSchedule = async (postId: string) => {
    try {
      await deleteScheduledPost(postId);
    } catch (error) {
      console.error('Failed to cancel schedule:', error);
    }
  };

  const handleReschedule = async (postId: string, newTime: Date) => {
    try {
      await updateScheduledPost(postId, { scheduledTime: newTime });
    } catch (error) {
      console.error('Failed to reschedule:', error);
    }
  };

  const filteredPosts = scheduledPosts.filter(post => {
    if (filterStatus === 'all') return true;
    return post.status === filterStatus;
  });

  const postsByDate = filteredPosts.reduce((acc, post) => {
    const dateKey = new Date(post.scheduledTime).toDateString();
    if (!acc[dateKey]) {
      acc[dateKey] = [];
    }
    acc[dateKey].push(post);
    return acc;
  }, {} as Record<string, any[]>);

  const selectedDatePosts = postsByDate[selectedDate.toDateString()] || [];

  const getStatusCounts = () => {
    const counts = {
      pending: 0,
      processing: 0,
      published: 0,
      failed: 0,
      total: scheduledPosts.length
    };
    
    scheduledPosts.forEach(post => {
      if (post.status in counts) {
        counts[post.status as keyof typeof counts]++;
      }
    });
    
    return counts;
  };

  const statusCounts = getStatusCounts();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Schedule</h2>
          <p className="text-muted-foreground mt-1">
            Plan and schedule your video posts across platforms
          </p>
        </div>
        
        <div className="flex items-center space-x-3">
          <button
            onClick={() => setShowScheduleForm(true)}
            className="bg-primary text-primary-foreground font-medium py-2 px-4 rounded-lg hover:bg-primary/90 transition-colors flex items-center space-x-2"
          >
            <Calendar className="w-4 h-4" />
            <span>Schedule New Post</span>
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="bg-card border border-border rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total</p>
              <p className="text-2xl font-bold text-foreground mt-1">
                {statusCounts.total}
              </p>
            </div>
            <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
              <Calendar className="w-5 h-5 text-gray-600" />
            </div>
          </div>
        </div>
        
        <div className="bg-card border border-border rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Pending</p>
              <p className="text-2xl font-bold text-foreground mt-1">
                {statusCounts.pending}
              </p>
            </div>
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <Clock className="w-5 h-5 text-blue-600" />
            </div>
          </div>
        </div>
        
        <div className="bg-card border border-border rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Processing</p>
              <p className="text-2xl font-bold text-foreground mt-1">
                {statusCounts.processing}
              </p>
            </div>
            <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center">
              <Upload className="w-5 h-5 text-yellow-600" />
            </div>
          </div>
        </div>
        
        <div className="bg-card border border-border rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Published</p>
              <p className="text-2xl font-bold text-foreground mt-1">
                {statusCounts.published}
              </p>
            </div>
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <Check className="w-5 h-5 text-green-600" />
            </div>
          </div>
        </div>
        
        <div className="bg-card border border-border rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Failed</p>
              <p className="text-2xl font-bold text-foreground mt-1">
                {statusCounts.failed}
              </p>
            </div>
            <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
              <AlertCircle className="w-5 h-5 text-red-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Calendar */}
        <div className="lg:col-span-2">
          <div className="bg-card border border-border rounded-xl p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-foreground">Schedule Calendar</h3>
              <div className="flex items-center space-x-2">
                <div className="relative">
                  <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className="pl-10 pr-4 py-2 bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary appearance-none"
                  >
                    <option value="all">All Status</option>
                    <option value="pending">Pending</option>
                    <option value="processing">Processing</option>
                    <option value="published">Published</option>
                    <option value="failed">Failed</option>
                  </select>
                </div>
              </div>
            </div>
            
            <ScheduleCalendar
              selectedDate={selectedDate}
              onDateSelect={handleDateSelect}
              scheduledPosts={scheduledPosts}
            />
          </div>
        </div>

        {/* Selected Date Posts */}
        <div className="lg:col-span-1">
          <div className="bg-card border border-border rounded-xl p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-foreground">
                Posts for {selectedDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
              </h3>
              <span className="text-sm text-muted-foreground">
                {selectedDatePosts.length} posts
              </span>
            </div>
            
            <div className="space-y-4">
              {selectedDatePosts.length === 0 ? (
                <div className="text-center py-8">
                  <div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                    <Calendar className="w-6 h-6 text-muted-foreground" />
                  </div>
                  <p className="text-foreground font-medium">No posts scheduled</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Schedule a post for this date to see it here
                  </p>
                </div>
              ) : (
                selectedDatePosts.map(post => (
                  <ScheduledPostCard
                    key={post.id}
                    post={post}
                    onCancel={handleCancelSchedule}
                    onReschedule={handleReschedule}
                  />
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* All Scheduled Posts */}
      <div className="bg-card border border-border rounded-xl p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-foreground">All Scheduled Posts</h3>
          <span className="text-sm text-muted-foreground">
            {filteredPosts.length} posts • Sorted by date
          </span>
        </div>
        
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <p className="text-muted-foreground">Loading scheduled posts...</p>
            </div>
          </div>
        ) : filteredPosts.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
              <Calendar className="w-8 h-8 text-muted-foreground" />
            </div>
            <h4 className="text-xl font-medium text-foreground mb-2">No scheduled posts</h4>
            <p className="text-muted-foreground mb-6">
              Schedule your first video post to get started
            </p>
            <button
              onClick={() => setShowScheduleForm(true)}
              className="bg-primary text-primary-foreground font-medium py-2 px-6 rounded-lg hover:bg-primary/90 transition-colors inline-flex items-center space-x-2"
            >
              <Calendar className="w-4 h-4" />
              <span>Schedule First Post</span>
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {Object.entries(postsByDate).map(([date, posts]) => (
              <div key={date}>
                <div className="sticky top-0 bg-card z-10 py-3 mb-3 border-b border-border">
                  <h4 className="font-medium text-foreground">
                    {new Date(date).toLocaleDateString('en-US', { 
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </h4>
                  <p className="text-sm text-muted-foreground">
                    {posts.length} posts scheduled
                  </p>
                </div>
                
                <div className="space-y-4">
                  {posts.map(post => (
                    <ScheduledPostCard
                      key={post.id}
                      post={post}
                      onCancel={handleCancelSchedule}
                      onReschedule={handleReschedule}
                      showDate={false}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Schedule Form Modal */}
      {showScheduleForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-background rounded-xl shadow-lg max-w-2xl w-full max-h-[90vh] overflow-auto">
            <ScheduleForm
              videos={videos}
              platforms={Object.values(platforms).filter(p => p.connected)}
              onSubmit={handleScheduleSubmit}
              onCancel={() => {
                setShowScheduleForm(false);
                setSelectedVideo(null);
              }}
              initialVideoId={selectedVideo}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default Schedule;