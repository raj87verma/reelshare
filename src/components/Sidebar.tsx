import React from 'react';
import { NavLink } from 'react-router-dom';
import { 
  Home, 
  Video, 
  Calendar, 
  BarChart3, 
  Users, 
  Settings,
  Upload
} from 'lucide-react';

const Sidebar: React.FC = () => {
  const navItems = [
    { path: '/dashboard', icon: Home, label: 'Dashboard' },
    { path: '/videos', icon: Video, label: 'Video Library' },
    { path: '/schedule', icon: Calendar, label: 'Schedule' },
    { path: '/analytics', icon: BarChart3, label: 'Analytics' },
    { path: '/accounts', icon: Users, label: 'Social Accounts' },
    { path: '/settings', icon: Settings, label: 'Settings' },
  ];

  return (
    <aside className="w-64 bg-background border-r border-border flex flex-col">
      {/* Logo */}
      <div className="p-6 border-b border-border">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-gradient-to-r from-primary to-pink-500 rounded-lg flex items-center justify-center">
            <Video className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="font-bold text-xl">ReelShare</h1>
            <p className="text-xs text-muted-foreground">Social Media Manager</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4">
        <div className="space-y-1">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `flex items-center space-x-3 p-3 rounded-lg transition-colors ${
                  isActive
                    ? 'bg-primary/10 text-primary'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                }`
              }
            >
              <item.icon className="w-5 h-5" />
              <span className="font-medium">{item.label}</span>
            </NavLink>
          ))}
        </div>

        {/* Upload Button */}
        <div className="mt-8 p-4">
          <button className="w-full bg-gradient-to-r from-primary to-pink-500 text-white font-medium py-3 px-4 rounded-lg hover:opacity-90 transition-opacity flex items-center justify-center space-x-2">
            <Upload className="w-5 h-5" />
            <span>Upload Video</span>
          </button>
        </div>
      </nav>

      {/* User Profile */}
      <div className="p-4 border-t border-border">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-muted rounded-full"></div>
          <div className="flex-1">
            <p className="font-medium text-sm">Alex Johnson</p>
            <p className="text-xs text-muted-foreground">Premium Plan</p>
          </div>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;