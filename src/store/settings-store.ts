import { create } from 'zustand';
import { toast } from 'sonner';

export interface AppSettings {
  general: {
    theme: 'light' | 'dark' | 'system';
    language: string;
    timezone: string;
    autoStart: boolean;
    minimizeToTray: boolean;
    checkForUpdates: boolean;
  };
  video: {
    defaultQuality: 'low' | 'medium' | 'high' | 'original';
    autoGenerateThumbnails: boolean;
    thumbnailTime: number;
    maxFileSize: number;
    autoCompression: boolean;
    compressionQuality: number;
    keepOriginalFiles: boolean;
  };
  upload: {
    concurrentUploads: number;
    retryFailedUploads: boolean;
    maxRetries: number;
    notifyOnComplete: boolean;
    notifyOnFailure: boolean;
  };
  notifications: {
    emailNotifications: boolean;
    pushNotifications: boolean;
    scheduleReminders: boolean;
    publishSuccess: boolean;
    publishFailure: boolean;
    tokenExpiry: boolean;
  };
  security: {
    autoLock: boolean;
    lockTimeout: number;
    encryptLocalData: boolean;
    clearClipboard: boolean;
    twoFactorAuth: boolean;
  };
  storage: {
    cacheLocation: string;
    maxCacheSize: number;
    autoCleanup: boolean;
    cleanupInterval: number;
    backupAutomatically: boolean;
    backupLocation: string;
  };
}

const defaultSettings: AppSettings = {
  general: {
    theme: 'system',
    language: 'en',
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    autoStart: false,
    minimizeToTray: true,
    checkForUpdates: true
  },
  video: {
    defaultQuality: 'high',
    autoGenerateThumbnails: true,
    thumbnailTime: 5,
    maxFileSize: 500,
    autoCompression: true,
    compressionQuality: 80,
    keepOriginalFiles: true
  },
  upload: {
    concurrentUploads: 3,
    retryFailedUploads: true,
    maxRetries: 3,
    notifyOnComplete: true,
    notifyOnFailure: true
  },
  notifications: {
    emailNotifications: false,
    pushNotifications: true,
    scheduleReminders: true,
    publishSuccess: true,
    publishFailure: true,
    tokenExpiry: true
  },
  security: {
    autoLock: false,
    lockTimeout: 15,
    encryptLocalData: true,
    clearClipboard: true,
    twoFactorAuth: false
  },
  storage: {
    cacheLocation: 'default',
    maxCacheSize: 5000,
    autoCleanup: true,
    cleanupInterval: 7,
    backupAutomatically: true,
    backupLocation: 'default'
  }
};

interface SettingsState {
  settings: AppSettings;
  loading: boolean;
  error: string | null;
  
  // Actions
  loadSettings: () => Promise<void>;
  updateSettings: (updates: Partial<AppSettings>) => Promise<void>;
  updateSetting: (category: keyof AppSettings, key: string, value: any) => Promise<void>;
  resetSettings: () => Promise<void>;
  exportSettings: () => Promise<string>;
  importSettings: (json: string) => Promise<boolean>;
  
  // Utility
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  clearError: () => void;
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  settings: defaultSettings,
  loading: false,
  error: null,

  loadSettings: async () => {
    set({ loading: true, error: null });
    
    try {
      // In a real app, this would load from Electron config service
      if (window.electronAPI?.config?.getAll) {
        const settings = await window.electronAPI.config.getAll();
        set({ settings, loading: false });
      } else {
        // Fallback to default settings
        set({ settings: defaultSettings, loading: false });
      }
      
    } catch (error) {
      set({ 
        loading: false,
        error: error instanceof Error ? error.message : 'Failed to load settings'
      });
      toast.error('Failed to load settings');
    }
  },

  updateSettings: async (updates: Partial<AppSettings>) => {
    set({ loading: true, error: null });
    
    try {
      // In a real app, this would save to Electron config service
      if (window.electronAPI?.config?.update) {
        await window.electronAPI.config.update(updates);
      }
      
      set(state => ({
        settings: { ...state.settings, ...updates },
        loading: false
      }));
      
      toast.success('Settings updated successfully');
      
    } catch (error) {
      set({ 
        loading: false,
        error: error instanceof Error ? error.message : 'Failed to update settings'
      });
      toast.error('Failed to update settings');
    }
  },

  updateSetting: async (category: keyof AppSettings, key: string, value: any) => {
    set({ loading: true, error: null });
    
    try {
      const updates = {
        [category]: {
          ...get().settings[category],
          [key]: value
        }
      };
      
      // In a real app, this would save to Electron config service
      if (window.electronAPI?.config?.update) {
        await window.electronAPI.config.update(updates);
      }
      
      set(state => ({
        settings: {
          ...state.settings,
          [category]: {
            ...state.settings[category],
            [key]: value
          }
        },
        loading: false
      }));
      
      toast.success('Setting updated successfully');
      
    } catch (error) {
      set({ 
        loading: false,
        error: error instanceof Error ? error.message : 'Failed to update setting'
      });
      toast.error('Failed to update setting');
    }
  },

  resetSettings: async () => {
    set({ loading: true, error: null });
    
    try {
      // In a real app, this would reset via Electron config service
      if (window.electronAPI?.config?.reset) {
        await window.electronAPI.config.reset();
      }
      
      set({ 
        settings: defaultSettings,
        loading: false
      });
      
      toast.success('Settings reset to defaults');
      
    } catch (error) {
      set({ 
        loading: false,
        error: error instanceof Error ? error.message : 'Failed to reset settings'
      });
      toast.error('Failed to reset settings');
    }
  },

  exportSettings: async (): Promise<string> => {
    set({ loading: true, error: null });
    
    try {
      let settingsData = '';
      
      // In a real app, this would export via Electron config service
      if (window.electronAPI?.config?.export) {
        settingsData = await window.electronAPI.config.export();
      } else {
        settingsData = JSON.stringify(get().settings, null, 2);
      }
      
      set({ loading: false });
      return settingsData;
      
    } catch (error) {
      set({ 
        loading: false,
        error: error instanceof Error ? error.message : 'Failed to export settings'
      });
      toast.error('Failed to export settings');
      throw error;
    }
  },

  importSettings: async (json: string): Promise<boolean> => {
    set({ loading: true, error: null });
    
    try {
      let success = false;
      
      // In a real app, this would import via Electron config service
      if (window.electronAPI?.config?.import) {
        success = await window.electronAPI.config.import(json);
      } else {
        const importedSettings = JSON.parse(json);
        // Basic validation
        if (importedSettings && typeof importedSettings === 'object') {
          set({ settings: importedSettings });
          success = true;
        }
      }
      
      set({ loading: false });
      
      if (success) {
        toast.success('Settings imported successfully');
      } else {
        toast.error('Failed to import settings');
      }
      
      return success;
      
    } catch (error) {
      set({ 
        loading: false,
        error: error instanceof Error ? error.message : 'Failed to import settings'
      });
      toast.error('Failed to import settings');
      return false;
    }
  },

  setLoading: (loading) => set({ loading }),
  
  setError: (error) => set({ error }),
  
  clearError: () => set({ error: null })
}));

// Helper function to get setting value
export const getSetting = <T>(
  settings: AppSettings,
  path: string
): T | undefined => {
  const keys = path.split('.');
  let value: any = settings;
  
  for (const key of keys) {
    if (value && typeof value === 'object' && key in value) {
      value = value[key];
    } else {
      return undefined;
    }
  }
  
  return value as T;
};

// Helper function to apply theme
export const applyTheme = (theme: 'light' | 'dark' | 'system') => {
  if (theme === 'system') {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    document.documentElement.classList.toggle('dark', prefersDark);
  } else {
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }
};

// Helper function to format file size
export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

// Helper function to validate settings
export const validateSettings = (settings: any): settings is AppSettings => {
  return (
    settings &&
    typeof settings === 'object' &&
    typeof settings.general === 'object' &&
    typeof settings.video === 'object' &&
    typeof settings.upload === 'object' &&
    typeof settings.notifications === 'object' &&
    typeof settings.security === 'object' &&
    typeof settings.storage === 'object'
  );
};