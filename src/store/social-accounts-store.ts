import { create } from 'zustand';
import { toast } from 'sonner';

export interface PlatformConnection {
  id: string;
  name: string;
  connected: boolean;
  status: 'connected' | 'disconnected' | 'expired' | 'error';
  username?: string;
  userId?: string;
  accessToken?: string;
  refreshToken?: string;
  expiresAt?: Date;
  lastConnected?: Date;
  scopes?: string[];
}

export interface AuthCredentials {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  scopes: string[];
}

interface SocialAccountsState {
  // Platforms
  platforms: Record<string, PlatformConnection>;
  loading: boolean;
  error: string | null;
  
  // Actions
  getPlatforms: () => Promise<void>;
  connectPlatform: (platformId: string, credentials: AuthCredentials) => Promise<void>;
  disconnectPlatform: (platformId: string) => Promise<void>;
  refreshPlatformToken: (platformId: string) => Promise<void>;
  updatePlatform: (platformId: string, updates: Partial<PlatformConnection>) => void;
  
  // Utility
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  clearError: () => void;
}

export const useSocialAccountsStore = create<SocialAccountsState>((set, get) => ({
  // Initial state
  platforms: {
    instagram: {
      id: 'instagram',
      name: 'Instagram',
      connected: false,
      status: 'disconnected'
    },
    tiktok: {
      id: 'tiktok',
      name: 'TikTok',
      connected: false,
      status: 'disconnected'
    },
    youtube: {
      id: 'youtube',
      name: 'YouTube',
      connected: false,
      status: 'disconnected'
    },
    facebook: {
      id: 'facebook',
      name: 'Facebook',
      connected: false,
      status: 'disconnected'
    }
  },
  loading: false,
  error: null,

  // Actions
  getPlatforms: async () => {
    set({ loading: true, error: null });
    
    try {
      // In a real app, this would fetch from the database
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Mock data for demonstration
      const mockPlatforms: Record<string, PlatformConnection> = {
        instagram: {
          id: 'instagram',
          name: 'Instagram',
          connected: true,
          status: 'connected',
          username: 'traveler_alex',
          userId: '123456789',
          lastConnected: new Date('2024-09-20'),
          scopes: ['instagram_basic', 'instagram_content_publish']
        },
        tiktok: {
          id: 'tiktok',
          name: 'TikTok',
          connected: true,
          status: 'connected',
          username: '@alexcreates',
          userId: 'tiktok_123',
          lastConnected: new Date('2024-09-18'),
          scopes: ['user.info.basic', 'video.upload']
        },
        youtube: {
          id: 'youtube',
          name: 'YouTube',
          connected: false,
          status: 'disconnected'
        },
        facebook: {
          id: 'facebook',
          name: 'Facebook',
          connected: false,
          status: 'disconnected'
        }
      };
      
      set({ platforms: mockPlatforms, loading: false });
      
    } catch (error) {
      set({ 
        loading: false,
        error: error instanceof Error ? error.message : 'Failed to load platforms'
      });
      toast.error('Failed to load platform connections');
    }
  },

  connectPlatform: async (platformId, credentials) => {
    set({ loading: true, error: null });
    
    try {
      // In a real app, this would:
      // 1. Open OAuth flow in browser
      // 2. Exchange code for tokens
      // 3. Save to database
      
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const mockConnection: PlatformConnection = {
        id: platformId,
        name: platformId.charAt(0).toUpperCase() + platformId.slice(1),
        connected: true,
        status: 'connected',
        username: platformId === 'instagram' ? 'traveler_alex' : 
                 platformId === 'tiktok' ? '@alexcreates' : 'alexchannel',
        userId: `${platformId}_${Date.now()}`,
        lastConnected: new Date(),
        scopes: credentials.scopes
      };
      
      set(state => ({
        platforms: {
          ...state.platforms,
          [platformId]: mockConnection
        },
        loading: false
      }));
      
      toast.success(`Connected to ${platformId} successfully`);
      
    } catch (error) {
      set({ 
        loading: false,
        error: error instanceof Error ? error.message : 'Failed to connect platform'
      });
      toast.error(`Failed to connect to ${platformId}`);
      throw error;
    }
  },

  disconnectPlatform: async (platformId) => {
    set({ loading: true, error: null });
    
    try {
      // In a real app, this would:
      // 1. Revoke tokens via platform API
      // 2. Remove from database
      
      await new Promise(resolve => setTimeout(resolve, 500));
      
      set(state => ({
        platforms: {
          ...state.platforms,
          [platformId]: {
            ...state.platforms[platformId],
            connected: false,
            status: 'disconnected',
            username: undefined,
            userId: undefined,
            accessToken: undefined,
            refreshToken: undefined,
            expiresAt: undefined
          }
        },
        loading: false
      }));
      
      toast.success(`Disconnected from ${platformId}`);
      
    } catch (error) {
      set({ 
        loading: false,
        error: error instanceof Error ? error.message : 'Failed to disconnect platform'
      });
      toast.error(`Failed to disconnect from ${platformId}`);
      throw error;
    }
  },

  refreshPlatformToken: async (platformId) => {
    set({ loading: true, error: null });
    
    try {
      // In a real app, this would:
      // 1. Call platform's token refresh endpoint
      // 2. Update tokens in database
      
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const platform = get().platforms[platformId];
      if (!platform || !platform.connected) {
        throw new Error('Platform not connected');
      }
      
      set(state => ({
        platforms: {
          ...state.platforms,
          [platformId]: {
            ...state.platforms[platformId],
            status: 'connected',
            lastConnected: new Date()
          }
        },
        loading: false
      }));
      
      toast.success(`Token refreshed for ${platformId}`);
      
    } catch (error) {
      set({ 
        loading: false,
        error: error instanceof Error ? error.message : 'Failed to refresh token'
      });
      toast.error(`Failed to refresh token for ${platformId}`);
      throw error;
    }
  },

  updatePlatform: (platformId, updates) => {
    set(state => ({
      platforms: {
        ...state.platforms,
        [platformId]: {
          ...state.platforms[platformId],
          ...updates
        }
      }
    }));
  },

  setLoading: (loading) => set({ loading }),
  
  setError: (error) => set({ error }),
  
  clearError: () => set({ error: null })
}));

// Helper function to check if token is expired
export const isTokenExpired = (expiresAt?: Date): boolean => {
  if (!expiresAt) return true;
  return expiresAt < new Date();
};

// Helper function to format platform name
export const formatPlatformName = (platformId: string): string => {
  const names: Record<string, string> = {
    instagram: 'Instagram',
    tiktok: 'TikTok',
    youtube: 'YouTube',
    facebook: 'Facebook',
    linkedin: 'LinkedIn',
    twitter: 'Twitter / X'
  };
  
  return names[platformId] || platformId;
};

// Helper function to get platform icon
export const getPlatformIcon = (platformId: string): string => {
  const icons: Record<string, string> = {
    instagram: '📷',
    tiktok: '🎵',
    youtube: '📺',
    facebook: '👥',
    linkedin: '💼',
    twitter: '🐦'
  };
  
  return icons[platformId] || '🔗';
};

// Helper function to get platform color
export const getPlatformColor = (platformId: string): string => {
  const colors: Record<string, string> = {
    instagram: 'from-purple-500 to-pink-500',
    tiktok: 'from-black to-gray-800',
    youtube: 'from-red-500 to-red-700',
    facebook: 'from-blue-600 to-blue-800',
    linkedin: 'from-blue-500 to-blue-700',
    twitter: 'from-black to-gray-900'
  };
  
  return colors[platformId] || 'from-gray-500 to-gray-700';
};