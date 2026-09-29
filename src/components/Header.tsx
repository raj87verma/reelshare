import React from 'react';
import { useLocation } from 'react-router-dom';
import { Bell, Search } from 'lucide-react';
import { useAppStore } from '../store/app-store';

const Header: React.FC = () => {
  const location = useLocation();
  const { notifications, user } = useAppStore();

  const getPageTitle = () => {
    const path = location.pathname;
    if (path === '/dashboard') return 'Dashboard';
    if (path === '/videos') return 'Video Library';
    if (path === '/schedule') return 'Schedule';
    if (path === '/analytics') return 'Analytics';
    if (path === '/accounts') return 'Social Accounts';
    if (path === '/settings') return 'Settings';
    return 'ReelShare';
  };

  return (
    <header className="bg-background border-b border-border px-6 py-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">{getPageTitle()}</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Welcome back! Manage your video content across platforms.
          </p>
        </div>
        
        <div className="flex items-center space-x-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search videos, posts, analytics..."
              className="pl-10 pr-4 py-2 bg-muted/50 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary w-64"
            />
          </div>

          {/* Notifications */}
          <div className="relative">
            <button className="relative p-2 hover:bg-muted rounded-lg transition-colors">
              <Bell className="w-5 h-5 text-muted-foreground" />
              {notifications.length > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-destructive text-white text-xs rounded-full flex items-center justify-center">
                  {notifications.length}
                </span>
              )}
            </button>
          </div>

          {/* User Profile */}
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-r from-primary to-pink-500 rounded-full flex items-center justify-center text-white text-sm font-semibold">
              {(user?.name || '?').charAt(0).toUpperCase()}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;