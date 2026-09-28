import React from 'react';
import { Check, X } from 'lucide-react';

const ConnectedPlatforms: React.FC = () => {
  const platforms = [
    {
      id: 'instagram',
      name: 'Instagram',
      icon: '📷',
      connected: true,
      color: 'from-purple-500 to-pink-500'
    },
    {
      id: 'tiktok',
      name: 'TikTok',
      icon: '🎵',
      connected: true,
      color: 'from-black to-gray-800'
    },
    {
      id: 'youtube',
      name: 'YouTube',
      icon: '📺',
      connected: true,
      color: 'from-red-500 to-red-700'
    },
    {
      id: 'linkedin',
      name: 'LinkedIn',
      icon: '💼',
      connected: false,
      color: 'from-blue-500 to-blue-700'
    }
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {platforms.map((platform) => (
        <div
          key={platform.id}
          className={`p-4 border rounded-lg flex items-center space-x-3 transition-colors ${
            platform.connected
              ? 'border-border hover:border-primary/50'
              : 'border-border/50 opacity-50'
          }`}
        >
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${platform.color} text-white`}>
            <span className="text-lg">{platform.icon}</span>
          </div>
          
          <div className="flex-1">
            <p className="font-medium text-foreground">{platform.name}</p>
            <div className="flex items-center space-x-1 mt-1">
              {platform.connected ? (
                <>
                  <Check className="w-3 h-3 text-green-500" />
                  <span className="text-xs text-green-600">Connected</span>
                </>
              ) : (
                <>
                  <X className="w-3 h-3 text-gray-400" />
                  <span className="text-xs text-gray-500">Not Connected</span>
                </>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default ConnectedPlatforms;