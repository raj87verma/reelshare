import React, { useEffect, useState } from 'react';
import { Check, X, RefreshCw, ExternalLink, MoreVertical, AlertCircle } from 'lucide-react';
import { useSocialAccountsStore } from '../store/social-accounts-store';
import { toast } from 'sonner';

const SocialAccounts: React.FC = () => {
  const { 
    platforms, 
    loading, 
    error, 
    getPlatforms,
    connectPlatform,
    disconnectPlatform,
    refreshPlatformToken 
  } = useSocialAccountsStore();

  const [connectingPlatform, setConnectingPlatform] = useState<string | null>(null);

  useEffect(() => {
    getPlatforms();
  }, [getPlatforms]);

  const handleConnect = async (platformId: string) => {
    setConnectingPlatform(platformId);
    
    try {
      // In a real app, this would open OAuth flow
      // For now, simulate connection
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      await connectPlatform(platformId, {
        clientId: 'test_client_id',
        clientSecret: 'test_client_secret',
        redirectUri: 'http://localhost:3000/auth/callback',
        scopes: ['basic', 'upload']
      });
      
      toast.success(`Connected to ${platformId} successfully`);
    } catch (error) {
      toast.error(`Failed to connect to ${platformId}`);
    } finally {
      setConnectingPlatform(null);
    }
  };

  const handleDisconnect = async (platformId: string) => {
    try {
      await disconnectPlatform(platformId);
      toast.success(`Disconnected from ${platformId}`);
    } catch (error) {
      toast.error(`Failed to disconnect from ${platformId}`);
    }
  };

  const handleRefresh = async (platformId: string) => {
    try {
      await refreshPlatformToken(platformId);
      toast.success(`Token refreshed for ${platformId}`);
    } catch (error) {
      toast.error(`Failed to refresh token for ${platformId}`);
    }
  };

  type PlatformDisplayStatus = 'connected' | 'disconnected' | 'expired' | 'error' | 'coming_soon';

  interface PlatformDisplayConfig {
    id: string;
    name: string;
    icon: string;
    description: string;
    color: string;
    connected: boolean;
    status: PlatformDisplayStatus;
    username?: string;
  }

  const platformConfigs: PlatformDisplayConfig[] = [
    {
      id: 'instagram',
      name: 'Instagram',
      icon: '📷',
      description: 'Share reels and posts',
      color: 'from-purple-500 to-pink-500',
      connected: platforms.instagram?.connected || false,
      status: platforms.instagram?.status || 'disconnected',
      username: platforms.instagram?.username
    },
    {
      id: 'tiktok',
      name: 'TikTok',
      icon: '🎵',
      description: 'Upload short-form videos',
      color: 'from-black to-gray-800',
      connected: platforms.tiktok?.connected || false,
      status: platforms.tiktok?.status || 'disconnected',
      username: platforms.tiktok?.username
    },
    {
      id: 'youtube',
      name: 'YouTube',
      icon: '📺',
      description: 'Upload videos and shorts',
      color: 'from-red-500 to-red-700',
      connected: platforms.youtube?.connected || false,
      status: platforms.youtube?.status || 'disconnected',
      username: platforms.youtube?.username
    },
    {
      id: 'facebook',
      name: 'Facebook',
      icon: '👥',
      description: 'Share to pages and groups',
      color: 'from-blue-600 to-blue-800',
      connected: false,
      status: 'coming_soon',
      username: undefined
    },
    {
      id: 'linkedin',
      name: 'LinkedIn',
      icon: '💼',
      description: 'Professional networking',
      color: 'from-blue-500 to-blue-700',
      connected: false,
      status: 'coming_soon',
      username: undefined
    },
    {
      id: 'twitter',
      name: 'Twitter / X',
      icon: '🐦',
      description: 'Share video clips',
      color: 'from-black to-gray-900',
      connected: false,
      status: 'coming_soon',
      username: undefined
    }
  ];

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'connected':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
            <Check className="w-3 h-3 mr-1" />
            Connected
          </span>
        );
      case 'disconnected':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
            <X className="w-3 h-3 mr-1" />
            Disconnected
          </span>
        );
      case 'expired':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
            <AlertCircle className="w-3 h-3 mr-1" />
            Token Expired
          </span>
        );
      case 'coming_soon':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
            Coming Soon
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-foreground">Social Accounts</h2>
        <p className="text-muted-foreground mt-1">
          Connect your social media accounts to schedule and publish videos
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-card border border-border rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Connected Platforms</p>
              <p className="text-2xl font-bold text-foreground mt-1">
                {platformConfigs.filter(p => p.connected).length}
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
              <p className="text-sm text-muted-foreground">Available Platforms</p>
              <p className="text-2xl font-bold text-foreground mt-1">
                {platformConfigs.length}
              </p>
            </div>
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <ExternalLink className="w-5 h-5 text-blue-600" />
            </div>
          </div>
        </div>
        
        <div className="bg-card border border-border rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Token Status</p>
              <p className="text-2xl font-bold text-foreground mt-1">
                {platformConfigs.filter(p => p.status === 'expired').length}
              </p>
              <p className="text-xs text-muted-foreground">needs refresh</p>
            </div>
            <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center">
              <RefreshCw className="w-5 h-5 text-yellow-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-muted-foreground">Loading platform connections...</p>
          </div>
        </div>
      )}

      {/* Error State */}
      {error && !loading && (
        <div className="bg-destructive/10 border border-destructive/20 rounded-xl p-4">
          <div className="flex items-center">
            <AlertCircle className="w-5 h-5 text-destructive mr-2" />
            <p className="text-destructive">{error}</p>
          </div>
        </div>
      )}

      {/* Platform Cards */}
      {!loading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {platformConfigs.map((platform) => (
            <div
              key={platform.id}
              className="bg-card border border-border rounded-xl p-6 hover:border-primary/30 transition-colors"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <div className={`w-12 h-12 bg-gradient-to-r ${platform.color} rounded-lg flex items-center justify-center text-white text-xl`}>
                    {platform.icon}
                  </div>
                  <div>
                    <h3 className="font-bold text-foreground">{platform.name}</h3>
                    <p className="text-sm text-muted-foreground">{platform.description}</p>
                  </div>
                </div>
                
                <div className="relative">
                  <button className="p-2 hover:bg-muted rounded-lg transition-colors">
                    <MoreVertical className="w-4 h-4 text-muted-foreground" />
                  </button>
                </div>
              </div>

              {/* Status and Username */}
              <div className="mb-4">
                {getStatusBadge(platform.status)}
                {platform.username && (
                  <p className="text-sm text-foreground mt-2">
                    Connected as <span className="font-medium">@{platform.username}</span>
                  </p>
                )}
              </div>

              {/* Actions */}
              <div className="space-y-2">
                {platform.status === 'connected' && (
                  <>
                    <button
                      onClick={() => handleRefresh(platform.id)}
                      className="w-full flex items-center justify-center space-x-2 px-4 py-2 bg-muted text-foreground rounded-lg hover:bg-muted/80 transition-colors"
                    >
                      <RefreshCw className="w-4 h-4" />
                      <span>Refresh Token</span>
                    </button>
                    
                    <button
                      onClick={() => handleDisconnect(platform.id)}
                      className="w-full flex items-center justify-center space-x-2 px-4 py-2 bg-destructive/10 text-destructive rounded-lg hover:bg-destructive/20 transition-colors"
                    >
                      <X className="w-4 h-4" />
                      <span>Disconnect</span>
                    </button>
                  </>
                )}

                {platform.status === 'disconnected' && (
                  <button
                    onClick={() => handleConnect(platform.id)}
                    disabled={connectingPlatform === platform.id}
                    className="w-full px-4 py-2 rounded-lg transition-colors flex items-center justify-center space-x-2 bg-primary text-primary-foreground hover:bg-primary/90"
                  >
                    {connectingPlatform === platform.id ? (
                      <>
                        <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                        <span>Connecting...</span>
                      </>
                    ) : (
                      <>
                        <ExternalLink className="w-4 h-4" />
                        <span>Connect Account</span>
                      </>
                    )}
                  </button>
                )}

                {platform.status === 'coming_soon' && (
                  <button
                    disabled
                    className="w-full px-4 py-2 rounded-lg flex items-center justify-center space-x-2 bg-muted text-muted-foreground cursor-not-allowed"
                  >
                    <span>Coming Soon</span>
                  </button>
                )}

                {platform.status === 'expired' && (
                  <>
                    <button
                      onClick={() => handleRefresh(platform.id)}
                      className="w-full flex items-center justify-center space-x-2 px-4 py-2 bg-yellow-100 text-yellow-800 rounded-lg hover:bg-yellow-200 transition-colors"
                    >
                      <RefreshCw className="w-4 h-4" />
                      <span>Refresh Token</span>
                    </button>
                    
                    <button
                      onClick={() => handleDisconnect(platform.id)}
                      className="w-full flex items-center justify-center space-x-2 px-4 py-2 bg-destructive/10 text-destructive rounded-lg hover:bg-destructive/20 transition-colors"
                    >
                      <X className="w-4 h-4" />
                      <span>Disconnect</span>
                    </button>
                  </>
                )}
              </div>

              {/* Platform Info */}
              <div className="mt-4 pt-4 border-t border-border text-xs text-muted-foreground">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <p className="font-medium">Max Video Size</p>
                    <p>100MB - 500MB</p>
                  </div>
                  <div>
                    <p className="font-medium">Max Duration</p>
                    <p>90s - 180s</p>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Help Text */}
      <div className="bg-muted/50 rounded-xl p-6">
        <h4 className="font-medium text-foreground mb-2">How to connect your accounts</h4>
        <ul className="space-y-2 text-sm text-muted-foreground">
          <li className="flex items-start space-x-2">
            <div className="w-5 h-5 bg-primary/10 text-primary rounded-full flex items-center justify-center flex-shrink-0">
              1
            </div>
            <span>Click "Connect Account" on your preferred platform</span>
          </li>
          <li className="flex items-start space-x-2">
            <div className="w-5 h-5 bg-primary/10 text-primary rounded-full flex items-center justify-center flex-shrink-0">
              2
            </div>
            <span>You'll be redirected to the platform's authorization page</span>
          </li>
          <li className="flex items-start space-x-2">
            <div className="w-5 h-5 bg-primary/10 text-primary rounded-full flex items-center justify-center flex-shrink-0">
              3
            </div>
            <span>Grant ReelShare permission to upload videos on your behalf</span>
          </li>
          <li className="flex items-start space-x-2">
            <div className="w-5 h-5 bg-primary/10 text-primary rounded-full flex items-center justify-center flex-shrink-0">
              4
            </div>
            <span>You'll be redirected back to ReelShare with your account connected</span>
          </li>
        </ul>
        
        <div className="mt-4 p-3 bg-background border border-border rounded-lg">
          <p className="text-sm font-medium text-foreground mb-1">Security Note</p>
          <p className="text-xs text-muted-foreground">
            Your access tokens are encrypted and stored locally on your device. 
            We never store your passwords or share your data with third parties.
          </p>
        </div>
      </div>
    </div>
  );
};

export default SocialAccounts;