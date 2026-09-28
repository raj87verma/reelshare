import { create } from 'zustand';

interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  read: boolean;
  timestamp: Date;
}

interface AppState {
  // App state
  initialized: boolean;
  loading: boolean;
  error: string | null;
  
  // User data
  user: {
    id: string;
    name: string;
    email: string;
    plan: string;
  } | null;
  
  // Notifications
  notifications: Notification[];
  
  // Actions
  initializeApp: () => Promise<void>;
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
  user: {
    id: '1',
    name: 'Alex Johnson',
    email: 'alex@example.com',
    plan: 'premium'
  },
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
      // Simulate initialization
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Load user data, settings, etc.
      set({ 
        initialized: true, 
        loading: false 
      });
      
      // Add welcome notification
      get().addNotification({
        title: 'Welcome to ReelShare',
        message: 'Your social media video manager is ready to use',
        type: 'info'
      });
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Failed to initialize app',
        loading: false 
      });
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
    };
  }
}