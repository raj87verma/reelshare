import { create } from 'zustand';
import { toast } from 'sonner';

interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  read: boolean;
  timestamp: Date;
}

export interface CurrentUser {
  id: string;
  name: string;
  email: string;
  plan: string;
}

// Electron's ipcRenderer.invoke() wraps any error thrown by the main
// process handler in generic boilerplate text, e.g.:
//   "Error invoking remote method 'auth:login': Error: Invalid email or password"
// Surfacing that raw text to the user (as the login/register form does via
// authError) looks broken/unprofessional. This strips the wrapper down to
// just the actual message the main process threw.
function cleanIpcErrorMessage(error: unknown): string {
  const raw = error instanceof Error ? error.message : String(error);
  const match = raw.match(/Error invoking remote method '[^']*':\s*(?:Error:\s*)?(.*)/s);
  return match ? match[1].trim() : raw;
}

interface AppState {
  // App state
  initialized: boolean;
  loading: boolean;
  error: string | null;

  // Authentication state. `authChecked` distinguishes "we haven't checked
  // the session yet" (show a loading screen) from "checked, and there is
  // no logged-in user" (show the Login screen) -- without it the app would
  // briefly flash the Login screen on every startup before the async
  // session check resolves.
  user: CurrentUser | null;
  authChecked: boolean;
  authLoading: boolean;
  authError: string | null;

  // Notifications
  notifications: Notification[];

  // Actions
  initializeApp: () => Promise<void>;
  checkSession: () => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, name: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  addNotification: (notification: Omit<Notification, 'id' | 'timestamp' | 'read'>) => void;
  markNotificationAsRead: (id: string) => void;
  clearNotifications: () => void;
  setUser: (user: AppState['user']) => void;
}

export const useAppStore = create<AppState>((set, get) => ({
  // Initial state
  initialized: false,
  loading: false,
  error: null,
  user: null,
  authChecked: false,
  authLoading: false,
  authError: null,
  notifications: [
    {
      id: '1',
      title: 'Video Published',
      message: 'Your video was successfully published to Instagram',
      type: 'success',
      read: false,
      timestamp: new Date()
    },
    {
      id: '2',
      title: 'Scheduled Post',
      message: 'Post scheduled for 2:30 PM today',
      type: 'info',
      read: false,
      timestamp: new Date()
    }
  ],

  // Actions
  initializeApp: async () => {
    set({ loading: true, error: null });

    try {
      await get().checkSession();

      set({
        initialized: true,
        loading: false
      });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to initialize app',
        loading: false
      });
    }
  },

  // Restores the logged-in user (if any) from the main process's
  // persisted session on app startup, so users don't have to log in
  // again every time they open the app.
  checkSession: async () => {
    try {
      if (window.electronAPI?.auth?.getCurrentUser) {
        const user = await window.electronAPI.auth.getCurrentUser();
        if (user) {
          set({ user: { ...user, plan: 'free' } });
        }
      }
    } catch (error) {
      console.error('Failed to check session:', error);
    } finally {
      set({ authChecked: true });
    }
  },

  login: async (email, password) => {
    set({ authLoading: true, authError: null });

    try {
      if (!window.electronAPI?.auth?.login) {
        throw new Error('Authentication is not available in this environment');
      }

      const user = await window.electronAPI.auth.login(email, password);
      set({ user: { ...user, plan: 'free' }, authLoading: false, authChecked: true });

      get().addNotification({
        title: `Welcome back, ${user.name}!`,
        message: 'You are now logged in to ReelShare',
        type: 'success'
      });
    } catch (error) {
      const message = cleanIpcErrorMessage(error);
      set({ authLoading: false, authError: message });
      throw error;
    }
  },

  register: async (email, name, password) => {
    set({ authLoading: true, authError: null });

    try {
      if (!window.electronAPI?.auth?.register) {
        throw new Error('Authentication is not available in this environment');
      }

      const user = await window.electronAPI.auth.register(email, name, password);
      set({ user: { ...user, plan: 'free' }, authLoading: false, authChecked: true });

      get().addNotification({
        title: 'Welcome to ReelShare',
        message: 'Your account has been created successfully',
        type: 'success'
      });
    } catch (error) {
      const message = cleanIpcErrorMessage(error);
      set({ authLoading: false, authError: message });
      throw error;
    }
  },

  logout: async () => {
    try {
      if (window.electronAPI?.auth?.logout) {
        await window.electronAPI.auth.logout();
      }
    } finally {
      set({ user: null });
      toast.success('Logged out successfully');
    }
  },

  setLoading: (loading) => set({ loading }),
  
  setError: (error) => set({ error }),
  
  addNotification: (notification) => {
    const newNotification: Notification = {
      ...notification,
      id: Date.now().toString(),
      timestamp: new Date(),
      read: false
    };
    
    set((state) => ({
      notifications: [newNotification, ...state.notifications]
    }));
  },

  markNotificationAsRead: (id) => {
    set((state) => ({
      notifications: state.notifications.map(notification =>
        notification.id === id ? { ...notification, read: true } : notification
      )
    }));
  },

  clearNotifications: () => {
    set({ notifications: [] });
  },

  setUser: (user) => {
    set({ user });
  }
}));

// Type definitions for Electron API
declare global {
  interface Window {
    electronAPI: {
      openFile: () => Promise<string | null>;
      openDirectory: () => Promise<string | null>;
      fileExists: (path: string) => Promise<boolean>;
      readFile: (path: string) => Promise<string>;
      writeFile: (path: string, data: string) => Promise<boolean>;
      deleteFile: (path: string) => Promise<boolean>;
      getVersion: () => Promise<string>;
      getPath: (name: string) => Promise<string>;
      onTrayAction: (callback: (action: string) => void) => void;
      onAppBeforeQuit: (callback: () => void) => void;
      sendEvent: (channel: string, data: any) => void;
      removeTrayActionListener: () => void;
      removeAppBeforeQuitListener: () => void;
      config: {
        getAll: () => Promise<any>;
        get: (path: string) => Promise<any>;
        set: (path: string, value: any) => Promise<boolean>;
        update: (updates: Record<string, any>) => Promise<boolean>;
        reset: () => Promise<boolean>;
        export: () => Promise<string>;
        import: (json: string) => Promise<boolean>;
        getPlatform: (platform: string) => Promise<any>;
        updatePlatform: (platform: string, updates: Record<string, any>) => Promise<boolean>;
        getMaxFileSize: () => Promise<number>;
        isFormatSupported: (format: string) => Promise<boolean>;
        getConcurrentUploads: () => Promise<number>;
        getCaption: (title: string, description: string) => Promise<string>;
      };
      auth: {
        register: (email: string, name: string, password: string) => Promise<{ id: string; email: string; name: string }>;
        login: (email: string, password: string) => Promise<{ id: string; email: string; name: string }>;
        logout: () => Promise<boolean>;
        getCurrentUser: () => Promise<{ id: string; email: string; name: string } | null>;
      };
      videos: {
        create: (videoData: Record<string, any>) => Promise<string>;
        getAll: (userId: string) => Promise<any[]>;
        get: (videoId: string) => Promise<any | null>;
        update: (videoId: string, updates: Record<string, any>) => Promise<void>;
        delete: (videoId: string) => Promise<void>;
        pickFile: () => Promise<string | null>;
        saveFile: (sourcePath: string, fileName: string) => Promise<string>;
        getMetadata: (filePath: string) => Promise<any>;
        generateThumbnail: (filePath: string, timestamp?: number) => Promise<string>;
      };
    };
  }
}