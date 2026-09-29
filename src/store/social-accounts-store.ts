import { create } from 'zustand';
import { toast } from 'sonner';
import { useAppStore } from './app-store';

// Electron's ipcRenderer.invoke() wraps any error thrown by the main
// process handler in generic boilerplate text, e.g.:
//   "Error invoking remote method 'platforms:authenticate': Error: YouTube
//    authentication failed: Error: Authorization was cancelled or denied"
// Surfacing that raw text (as connectPlatform's toast/thrown error did)
// looks broken/unprofessional -- this strips it down to just the actual,
// innermost message a platform subclass or the OAuth loopback server
// threw. Mirrors cleanIpcErrorMessage() in app-store.ts (same underlying
// bug, different IPC channel).
function cleanIpcErrorMessage(error: unknown): string {
  const raw = error instanceof Error ? error.message : String(error);
  // Repeatedly strip IPC-wrapper and generic "Error:" prefixes, since
  // platform subclasses often re-wrap (e.g. "X authentication failed:
  // Error: <root cause>"), leaving several layers to peel off.
  let message = raw;
  for (let i = 0; i < 5; i++) {
    const ipcMatch = message.match(/^Error invoking remote method '[^']*':\s*(?:Error:\s*)?(.*)$/s);
    if (ipcMatch) {
      message = ipcMatch[1].trim();
      continue;
    }
    const prefixMatch = message.match(/^[A-Za-z ]+ (?:authentication|connection) failed:\s*(?:Error:\s*)?(.*)$/s);
    if (prefixMatch) {
      message = prefixMatch[1].trim();
      continue;
    }
    break;
  }
  return message;
}

export interface PlatformConnection {
  id: string;
  name: string;
  connected: boolean;
  status: 'connected' | 'disconnected' | 'expired' | 'error';
  username?: string;
  userId?: string;
  // The social_accounts row id for this connection (see
  // electron/database.ts), needed by the Schedule form to know which
  // account a scheduled post's account_id foreign key should point to.
  accountId?: string;
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

function getCurrentUserId(): string | null {
  return useAppStore.getState().user?.id || null;
}

const emptyPlatforms: Record<string, PlatformConnection> = {
  instagram: { id: 'instagram', name: 'Instagram', connected: false, status: 'disconnected' },
  tiktok: { id: 'tiktok', name: 'TikTok', connected: false, status: 'disconnected' },
  youtube: { id: 'youtube', name: 'YouTube', connected: false, status: 'disconnected' },
  facebook: { id: 'facebook', name: 'Facebook', connected: false, status: 'disconnected' }
};

export const useSocialAccountsStore = create<SocialAccountsState>((set, get) => ({
  // Initial state -- nothing is connected until getPlatforms() reads the
  // real state from the database. There is no default/mock "connected"
  // account here (the previous version hardcoded Instagram/TikTok as
  // already connected as '@traveler_alex' / '@alexcreates', a fictional
  // demo account nobody actually authenticated).
  platforms: emptyPlatforms,
  loading: false,
  error: null,

  // Reads real connection status for the logged-in user from the
  // database (via platforms:getAllStatuses -> social_accounts table),
  // replacing the previous hardcoded mock response.
  getPlatforms: async () => {
    const userId = getCurrentUserId();
    if (!userId) {
      set({ platforms: emptyPlatforms, loading: false });
      return;
    }

    set({ loading: true, error: null });

    try {
      if (!window.electronAPI?.platforms) {
        set({ platforms: emptyPlatforms, loading: false });
        return;
      }

      const statuses = await window.electronAPI.platforms.getAllStatuses(userId);

      const platforms: Record<string, PlatformConnection> = { ...emptyPlatforms };
      for (const status of statuses) {
        const isExpired = status.expiresAt ? new Date(status.expiresAt) < new Date() : false;
        platforms[status.platform] = {
          id: status.platform,
          name: status.platform.charAt(0).toUpperCase() + status.platform.slice(1),
          connected: status.connected,
          status: !status.connected ? 'disconnected' : isExpired ? 'expired' : 'connected',
          username: status.username,
          accountId: status.accountId,
          expiresAt: status.expiresAt ? new Date(status.expiresAt) : undefined,
          lastConnected: status.connected ? new Date() : undefined
        };
      }

      set({ platforms, loading: false });
      
    } catch (error) {
      set({ 
        loading: false,
        error: error instanceof Error ? error.message : 'Failed to load platforms'
      });
      toast.error('Failed to load platform connections');
    }
  },

  // Runs the real OAuth Authorization Code flow: opens the platform's
  // actual login/consent page in the user's system browser and waits for
  // the redirect to be captured locally (see electron/oauth-loopback.ts),
  // then exchanges the resulting code for real access/refresh tokens and
  // persists them to the database. This replaces the previous
  // implementation, which just waited 2 seconds and flipped local state
  // to "connected" with a hardcoded fake username -- no browser ever
  // opened and no real platform was ever contacted, no matter what
  // credentials were entered.
  connectPlatform: async (platformId, credentials) => {
    const userId = getCurrentUserId();
    if (!userId) {
      toast.error('You must be logged in to connect an account');
      return;
    }

    set({ loading: true, error: null });
    
    try {
      if (!window.electronAPI?.platforms) {
        throw new Error('Platform connections are not available in this environment');
      }

      await window.electronAPI.platforms.authenticate(userId, platformId, credentials);

      // Re-fetch from the database rather than constructing the new
      // PlatformConnection by hand here -- this picks up the real
      // social_accounts row id (accountId), which the Schedule form needs
      // to know which account a scheduled post should target.
      await get().getPlatforms();
      set({ loading: false });
      
    } catch (error) {
      const message = cleanIpcErrorMessage(error);
      set({ loading: false, error: message });
      throw new Error(message);
    }
  },

  disconnectPlatform: async (platformId) => {
    const userId = getCurrentUserId();
    if (!userId) return;

    set({ loading: true, error: null });
    
    try {
      if (!window.electronAPI?.platforms) {
        throw new Error('Platform connections are not available in this environment');
      }

      await window.electronAPI.platforms.disconnect(userId, platformId);
      
      set(state => ({
        platforms: {
          ...state.platforms,
          [platformId]: {
            id: platformId,
            name: platformId.charAt(0).toUpperCase() + platformId.slice(1),
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
      const message = cleanIpcErrorMessage(error);
      set({ loading: false, error: message });
      toast.error(message);
      throw new Error(message);
    }
  },

  refreshPlatformToken: async (platformId) => {
    const userId = getCurrentUserId();
    if (!userId) return;

    set({ loading: true, error: null });
    
    try {
      if (!window.electronAPI?.platforms) {
        throw new Error('Platform connections are not available in this environment');
      }

      const platform = get().platforms[platformId];
      if (!platform || !platform.connected) {
        throw new Error('Platform not connected');
      }

      const authResult = await window.electronAPI.platforms.refreshToken(userId, platformId);
      
      set(state => ({
        platforms: {
          ...state.platforms,
          [platformId]: {
            ...state.platforms[platformId],
            status: 'connected',
            expiresAt: authResult.expiresAt ? new Date(authResult.expiresAt) : undefined,
            lastConnected: new Date()
          }
        },
        loading: false
      }));
      
    } catch (error) {
      const message = cleanIpcErrorMessage(error);
      set({ loading: false, error: message });
      throw new Error(message);
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
