import React, { useEffect } from 'react';
import { Check, X } from 'lucide-react';
import { useSocialAccountsStore, getPlatformIcon, getPlatformColor } from '../store/social-accounts-store';

// Shows the user's *real* platform connection status (read from the
// social_accounts table via useSocialAccountsStore), rather than the
// previous version's local hardcoded array, which claimed Instagram,
// TikTok, and YouTube were always "Connected" regardless of whether the
// user had actually connected anything at all.
const ConnectedPlatforms: React.FC = () => {
  const { platforms, getPlatforms } = useSocialAccountsStore();

  useEffect(() => {
    getPlatforms();
  }, [getPlatforms]);

  const platformList = Object.values(platforms);

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {platformList.map((platform) => (
        <div
          key={platform.id}
          className={`p-4 border rounded-lg flex items-center space-x-3 transition-colors ${
            platform.connected
              ? 'border-border hover:border-primary/50'
              : 'border-border/50 opacity-50'
          }`}
        >
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center bg-gradient-to-r ${getPlatformColor(platform.id)} text-white`}>
            <span className="text-lg">{getPlatformIcon(platform.id)}</span>
          </div>
          
          <div className="flex-1">
            <p className="font-medium text-foreground">{platform.name}</p>
            <div className="flex items-center space-x-1 mt-1">
              {platform.connected ? (
                <>
                  <Check className="w-3 h-3 text-green-500" />
                  <span className="text-xs text-green-600">
                    {platform.username ? `@${platform.username}` : 'Connected'}
                  </span>
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
