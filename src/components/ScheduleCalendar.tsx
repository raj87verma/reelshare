import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react';
import { ScheduledPost } from '../store/schedule-store';

interface ScheduleCalendarProps {
  selectedDate: Date;
  onDateSelect: (date: Date) => void;
  scheduledPosts: ScheduledPost[];
}

const ScheduleCalendar: React.FC<ScheduleCalendarProps> = ({
  selectedDate,
  onDateSelect,
  scheduledPosts
}) => {
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const getDaysInMonth = (year: number, month: number) => {
    return new Date(year, month + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (year: number, month: number) => {
    return new Date(year, month, 1).getDay();
  };

  const getPostsForDate = (date: Date) => {
    return scheduledPosts.filter(post => {
      const postDate = new Date(post.scheduledTime);
      return (
        postDate.getDate() === date.getDate() &&
        postDate.getMonth() === date.getMonth() &&
        postDate.getFullYear() === date.getFullYear()
      );
    });
  };

  const getStatusCountsForDate = (date: Date) => {
    const posts = getPostsForDate(date);
    const counts = {
      pending: 0,
      processing: 0,
      published: 0,
      failed: 0,
      total: posts.length
    };
    
    posts.forEach(post => {
      if (post.status in counts) {
        counts[post.status as keyof typeof counts]++;
      }
    });
    
    return counts;
  };

  const renderCalendar = () => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    
    const daysInMonth = getDaysInMonth(year, month);
    const firstDay = getFirstDayOfMonth(year, month);
    
    const days = [];
    
    // Add empty cells for days before the first day of the month
    for (let i = 0; i < firstDay; i++) {
      days.push(<div key={`empty-${i}`} className="h-24"></div>);
    }
    
    // Add cells for each day of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day);
      const isToday = date.toDateString() === new Date().toDateString();
      const isSelected = date.toDateString() === selectedDate.toDateString();
      const postsForDay = getPostsForDate(date);
      const statusCounts = getStatusCountsForDate(date);
      
      days.push(
        <button
          key={day}
          onClick={() => onDateSelect(date)}
          className={`
            h-24 p-2 border border-border rounded-lg text-left transition-colors
            hover:bg-muted hover:border-primary/50
            ${isSelected ? 'bg-primary/10 border-primary' : ''}
            ${isToday ? 'border-primary/30' : ''}
          `}
        >
          <div className="flex items-center justify-between mb-1">
            <span className={`
              font-medium text-sm
              ${isToday ? 'text-primary font-bold' : ''}
              ${isSelected ? 'text-primary' : 'text-foreground'}
            `}>
              {day}
            </span>
            {isToday && (
              <span className="w-2 h-2 bg-primary rounded-full"></span>
            )}
          </div>
          
          {postsForDay.length > 0 && (
            <div className="space-y-1">
              <div className="flex items-center space-x-1">
                {statusCounts.pending > 0 && (
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                )}
                {statusCounts.processing > 0 && (
                  <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                )}
                {statusCounts.published > 0 && (
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                )}
                {statusCounts.failed > 0 && (
                  <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                )}
              </div>
              
              <div className="text-xs text-muted-foreground">
                {postsForDay.length} post{postsForDay.length !== 1 ? 's' : ''}
              </div>
              
              {postsForDay.some(post => post.status === 'failed') && (
                <div className="text-xs text-red-500">
                  {postsForDay.filter(post => post.status === 'failed').length} failed
                </div>
              )}
            </div>
          )}
        </button>
      );
    }
    
    return days;
  };

  const goToPreviousMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  };

  const goToNextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  };

  const goToToday = () => {
    const today = new Date();
    setCurrentMonth(today);
    onDateSelect(today);
  };

  const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <div className="space-y-4">
      {/* Calendar Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button
            onClick={goToPreviousMonth}
            className="p-2 hover:bg-muted rounded-lg transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          
          <h4 className="text-lg font-semibold text-foreground">
            {currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
          </h4>
          
          <button
            onClick={goToNextMonth}
            className="p-2 hover:bg-muted rounded-lg transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
        
        <button
          onClick={goToToday}
          className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors flex items-center space-x-2"
        >
          <CalendarIcon className="w-4 h-4" />
          <span>Today</span>
        </button>
      </div>

      {/* Weekday Headers */}
      <div className="grid grid-cols-7 gap-2 mb-2">
        {weekdays.map(day => (
          <div key={day} className="text-center text-sm font-medium text-muted-foreground">
            {day}
          </div>
        ))}
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-2">
        {renderCalendar()}
      </div>

      {/* Legend */}
      <div className="pt-4 border-t border-border">
        <h5 className="text-sm font-medium text-foreground mb-3">Status Legend</h5>
        <div className="flex flex-wrap gap-4">
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
            <span className="text-sm text-muted-foreground">Pending</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
            <span className="text-sm text-muted-foreground">Processing</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-green-500 rounded-full"></div>
            <span className="text-sm text-muted-foreground">Published</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-red-500 rounded-full"></div>
            <span className="text-sm text-muted-foreground">Failed</span>
          </div>
        </div>
      </div>

      {/* Selected Date Summary */}
      <div className="bg-muted/50 rounded-lg p-4">
        <div className="flex items-center justify-between mb-2">
          <h5 className="font-medium text-foreground">
            {selectedDate.toLocaleDateString('en-US', { 
              weekday: 'long', 
              month: 'long', 
              day: 'numeric',
              year: 'numeric'
            })}
          </h5>
          <span className="text-sm text-muted-foreground">
            {getPostsForDate(selectedDate).length} scheduled posts
          </span>
        </div>
        
        {getPostsForDate(selectedDate).length > 0 ? (
          <div className="space-y-2">
            {getPostsForDate(selectedDate).map(post => (
              <div key={post.id} className="flex items-center justify-between text-sm">
                <div className="flex items-center space-x-2">
                  <div className={`w-2 h-2 rounded-full ${
                    post.status === 'pending' ? 'bg-blue-500' :
                    post.status === 'processing' ? 'bg-yellow-500' :
                    post.status === 'published' ? 'bg-green-500' : 'bg-red-500'
                  }`}></div>
                  <span className="font-medium">{post.videoTitle}</span>
                </div>
                <div className="text-muted-foreground">
                  {post.scheduledTime.toLocaleTimeString('en-US', { 
                    hour: 'numeric', 
                    minute: '2-digit' 
                  })}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            No posts scheduled for this date
          </p>
        )}
      </div>
    </div>
  );
};

export default ScheduleCalendar;