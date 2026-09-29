import Store from 'electron-store';
import { ipcMain } from 'electron';

export interface AppSettings {
  // General settings
  general: {
    theme: 'light' | 'dark' | 'system';
    language: string;
    timezone: string;
    autoStart: boolean;
    minimizeToTray: boolean;
    checkForUpdates: boolean;
  };
  
  // Video settings
  video: {
    defaultQuality: 'low' | 'medium' | 'high' | 'original';
    autoGenerateThumbnails: boolean;
    thumbnailTime: number;
    maxFileSize: number; // MB
    // User-configurable ceiling on how long an uploaded video may be, in
    // seconds. This is ReelShare's own local limit (enforced at upload
    // time in the UI), separate from each platform's own maxVideoDuration
    // in electron/social-platforms/*.ts, which is that platform's actual
    // API-enforced cap and isn't user-adjustable.
    maxDurationSeconds: number;
    autoCompression: boolean;
    compressionQuality: number; // 1-100
    keepOriginalFiles: boolean;
    supportedFormats: string[];
  };
  
  // Upload settings
  upload: {
    concurrentUploads: number;
    retryFailedUploads: boolean;
    maxRetries: number;
    notifyOnComplete: boolean;
    notifyOnFailure: boolean;
    defaultCaptionTemplate: string;
    defaultHashtags: string[];
  };
  
  // Notification settings
  notifications: {
    emailNotifications: boolean;
    pushNotifications: boolean;
    scheduleReminders: boolean;
    publishSuccess: boolean;
    publishFailure: boolean;
    tokenExpiry: boolean;
    soundEnabled: boolean;
  };
  
  // Security settings
  security: {
    autoLock: boolean;
    lockTimeout: number; // minutes
    encryptLocalData: boolean;
    clearClipboard: boolean;
    twoFactorAuth: boolean;
    sessionTimeout: number; // minutes
  };
  
  // Storage settings
  storage: {
    cacheLocation: string;
    maxCacheSize: number; // MB
    autoCleanup: boolean;
    cleanupInterval: number; // days
    backupAutomatically: boolean;
    backupLocation: string;
    keepLogsDays: number;
  };
  
  // Platform-specific settings
  platforms: {
    instagram: {
      defaultReel: boolean;
      defaultStory: boolean;
      defaultVisibility: 'public' | 'private' | 'friends';
      autoAddLocation: boolean;
      defaultHashtags: string[];
    };
    tiktok: {
      defaultVisibility: 'public' | 'private' | 'friends';
      allowDuet: boolean;
      allowStitch: boolean;
      allowComment: boolean;
      defaultHashtags: string[];
    };
    youtube: {
      defaultCategory: string;
      defaultVisibility: 'public' | 'private' | 'unlisted';
      allowComments: boolean;
      allowRatings: boolean;
      defaultTags: string[];
    };
  };

  // Developer API credentials for each platform (Client ID / Client Secret
  // from Instagram/Facebook Developer Portal, Google Cloud Console, TikTok
  // Developer Portal). These are required before a user can connect any
  // account on the Social Accounts page -- the app cannot start an OAuth
  // flow without them. Stored via electron-store, same as all other
  // settings, in the user's app data directory.
  apiCredentials: {
    instagram: { clientId: string; clientSecret: string; redirectUri: string };
    tiktok: { clientId: string; clientSecret: string; redirectUri: string };
    youtube: { clientId: string; clientSecret: string; redirectUri: string };
    facebook: { clientId: string; clientSecret: string; redirectUri: string };
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
    // Default ceiling of 30 minutes -- comfortably above every
    // individual platform's own cap (Instagram 15min, TikTok 10min,
    // Facebook 240min, YouTube effectively unlimited for long-form), so
    // it doesn't get in the way by default. Platform-specific limits are
    // still enforced separately when actually publishing to that platform.
    maxDurationSeconds: 30 * 60,
    autoCompression: true,
    compressionQuality: 80,
    keepOriginalFiles: true,
    supportedFormats: ['mp4', 'mov', 'avi', 'mkv', 'webm']
  },
  upload: {
    concurrentUploads: 3,
    retryFailedUploads: true,
    maxRetries: 3,
    notifyOnComplete: true,
    notifyOnFailure: true,
    defaultCaptionTemplate: '{{title}}\n\n{{description}}',
    defaultHashtags: ['reelshare', 'video', 'content']
  },
  notifications: {
    emailNotifications: false,
    pushNotifications: true,
    scheduleReminders: true,
    publishSuccess: true,
    publishFailure: true,
    tokenExpiry: true,
    soundEnabled: true
  },
  security: {
    autoLock: false,
    lockTimeout: 15,
    encryptLocalData: true,
    clearClipboard: true,
    twoFactorAuth: false,
    sessionTimeout: 60
  },
  storage: {
    cacheLocation: 'default',
    maxCacheSize: 5000,
    autoCleanup: true,
    cleanupInterval: 7,
    backupAutomatically: true,
    backupLocation: 'default',
    keepLogsDays: 30
  },
  platforms: {
    instagram: {
      defaultReel: true,
      defaultStory: false,
      defaultVisibility: 'public',
      autoAddLocation: false,
      defaultHashtags: ['instagram', 'reel', 'video']
    },
    tiktok: {
      defaultVisibility: 'public',
      allowDuet: true,
      allowStitch: true,
      allowComment: true,
      defaultHashtags: ['tiktok', 'fyp', 'video']
    },
    youtube: {
      defaultCategory: '22', // People & Blogs
      defaultVisibility: 'public',
      allowComments: true,
      allowRatings: true,
      defaultTags: ['video', 'content', 'youtube']
    }
  },
  apiCredentials: {
    instagram: { clientId: '', clientSecret: '', redirectUri: 'http://localhost:3000/auth/instagram/callback' },
    tiktok: { clientId: '', clientSecret: '', redirectUri: 'http://localhost:3000/auth/tiktok/callback' },
    youtube: { clientId: '', clientSecret: '', redirectUri: 'http://localhost:3000/auth/youtube/callback' },
    facebook: { clientId: '', clientSecret: '', redirectUri: 'http://localhost:3000/auth/facebook/callback' }
  }
};

class ConfigService {
  private store: Store<AppSettings>;
  private settings: AppSettings;

  constructor() {
    this.store = new Store<AppSettings>({
      defaults: defaultSettings,
      name: 'reelshare-config',
      clearInvalidConfig: true,
      migrations: {
        '>=1.1.0': (store) => {
          // Migration logic for version updates
          const oldSettings = store.store;
          
          // Add new settings if they don't exist
          if (!oldSettings.platforms?.youtube?.allowComments) {
            store.set('platforms.youtube.allowComments', true);
          }
          
          if (!oldSettings.notifications?.soundEnabled) {
            store.set('notifications.soundEnabled', true);
          }
        },
        '>=1.0.5': (store) => {
          const oldSettings = store.store;

          // video.maxDurationSeconds is new in 1.0.5; users upgrading
          // from an earlier version won't have it set yet.
          if (oldSettings.video && oldSettings.video.maxDurationSeconds === undefined) {
            store.set('video.maxDurationSeconds', 30 * 60);
          }

          // apiCredentials.facebook is new in 1.0.5 (Facebook support was
          // added alongside this release).
          if (oldSettings.apiCredentials && !oldSettings.apiCredentials.facebook) {
            store.set('apiCredentials.facebook', {
              clientId: '',
              clientSecret: '',
              redirectUri: 'http://localhost:3000/auth/facebook/callback'
            });
          }
        }
      }
    });

    this.settings = this.store.store;
  }

  getSettings(): AppSettings {
    return { ...this.settings };
  }

  getSetting<T>(path: string): T | undefined {
    return this.store.get(path) as T;
  }

  setSetting(path: string, value: any): void {
    this.store.set(path, value);
    this.settings = this.store.store;
  }

  updateSettings(updates: Partial<AppSettings>): void {
    Object.entries(updates).forEach(([key, value]) => {
      if (value !== undefined) {
        this.store.set(key, value);
      }
    });
    this.settings = this.store.store;
  }

  resetSettings(): void {
    this.store.clear();
    this.settings = defaultSettings;
    Object.entries(defaultSettings).forEach(([key, value]) => {
      this.store.set(key, value);
    });
  }

  exportSettings(): string {
    return JSON.stringify(this.settings, null, 2);
  }

  importSettings(json: string): boolean {
    try {
      const importedSettings = JSON.parse(json);
      
      // Validate imported settings structure
      if (!this.validateSettings(importedSettings)) {
        throw new Error('Invalid settings structure');
      }
      
      this.store.store = importedSettings;
      this.settings = importedSettings;
      return true;
    } catch (error) {
      console.error('Failed to import settings:', error);
      return false;
    }
  }

  private validateSettings(settings: any): settings is AppSettings {
    // Basic validation - in a real app, this would be more comprehensive
    return (
      settings &&
      typeof settings === 'object' &&
      typeof settings.general === 'object' &&
      typeof settings.video === 'object' &&
      typeof settings.upload === 'object'
    );
  }

  // Platform-specific helpers
  getPlatformSettings(platform: string): any {
    return this.settings.platforms[platform as keyof AppSettings['platforms']];
  }

  updatePlatformSettings(platform: string, updates: any): void {
    const current = this.getPlatformSettings(platform);
    if (current) {
      this.setSetting(`platforms.${platform}`, { ...current, ...updates });
    }
  }

  // Video processing helpers
  getMaxFileSizeBytes(): number {
    return this.settings.video.maxFileSize * 1024 * 1024; // Convert MB to bytes
  }

  getSupportedFormats(): string[] {
    return this.settings.video.supportedFormats;
  }

  isFormatSupported(format: string): boolean {
    const ext = format.toLowerCase().replace(/^\./, '');
    return this.settings.video.supportedFormats.includes(ext);
  }

  // Upload helpers
  getConcurrentUploads(): number {
    return Math.max(1, Math.min(10, this.settings.upload.concurrentUploads));
  }

  getCaptionWithTemplate(title: string, description: string): string {
    const template = this.settings.upload.defaultCaptionTemplate;
    return template
      .replace(/{{title}}/g, title)
      .replace(/{{description}}/g, description);
  }

  // Security helpers
  shouldEncryptData(): boolean {
    return this.settings.security.encryptLocalData;
  }

  getSessionTimeoutMs(): number {
    return this.settings.security.sessionTimeout * 60 * 1000; // Convert minutes to milliseconds
  }
}

export const configService = new ConfigService();

export function initConfigService(): void {
  console.log('Configuration service initialized');
  
  // IPC handlers for configuration
  ipcMain.handle('config:getAll', () => {
    return configService.getSettings();
  });
  
  ipcMain.handle('config:get', (_, path: string) => {
    return configService.getSetting(path);
  });
  
  ipcMain.handle('config:set', (_, path: string, value: any) => {
    configService.setSetting(path, value);
    return true;
  });
  
  ipcMain.handle('config:update', (_, updates: Partial<AppSettings>) => {
    configService.updateSettings(updates);
    return true;
  });
  
  ipcMain.handle('config:reset', () => {
    configService.resetSettings();
    return true;
  });
  
  ipcMain.handle('config:export', () => {
    return configService.exportSettings();
  });
  
  ipcMain.handle('config:import', (_, json: string) => {
    return configService.importSettings(json);
  });
  
  ipcMain.handle('config:getPlatform', (_, platform: string) => {
    return configService.getPlatformSettings(platform);
  });
  
  ipcMain.handle('config:updatePlatform', (_, platform: string, updates: any) => {
    configService.updatePlatformSettings(platform, updates);
    return true;
  });
  
  ipcMain.handle('config:getMaxFileSize', () => {
    return configService.getMaxFileSizeBytes();
  });
  
  ipcMain.handle('config:isFormatSupported', (_, format: string) => {
    return configService.isFormatSupported(format);
  });
  
  ipcMain.handle('config:getConcurrentUploads', () => {
    return configService.getConcurrentUploads();
  });
  
  ipcMain.handle('config:getCaption', (_, title: string, description: string) => {
    return configService.getCaptionWithTemplate(title, description);
  });
}