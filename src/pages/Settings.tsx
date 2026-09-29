import React, { useState, useEffect } from 'react';
import { Save, User, Bell, Video, Globe, Shield, Database, Download, Moon, Sun, Key, Eye, EyeOff, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';
import { useAppStore } from '../store/app-store';
import { useSettingsStore, applyTheme } from '../store/settings-store';

const Settings: React.FC = () => {
  const { user } = useAppStore();
  const { 
    settings, 
    loading, 
    loadSettings, 
    updateSetting, 
    resetSettings,
    exportSettings,
    importSettings 
  } = useSettingsStore();
  
  const [activeTab, setActiveTab] = useState<string>('general');

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  const handleSettingChange = (category: keyof typeof settings, key: string, value: any) => {
    updateSetting(category, key, value);
    
    // Apply theme immediately if it's changed
    if (category === 'general' && key === 'theme') {
      applyTheme(value);
    }
  };

  const handleSaveSettings = () => {
    toast.success('Settings saved successfully');
  };

  const handleExportData = async () => {
    try {
      const settingsData = await exportSettings();
      const blob = new Blob([settingsData], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'reelshare-settings.json';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success('Settings exported successfully');
    } catch (error) {
      toast.error('Failed to export settings');
    }
  };

  const handleImportData = async () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        try {
          const text = await file.text();
          const success = await importSettings(text);
          if (success) {
            // Reload settings after import
            await loadSettings();
          }
        } catch (error) {
          toast.error('Failed to import settings');
        }
      }
    };
    
    input.click();
  };

  const handleResetSettings = async () => {
    if (window.confirm('Are you sure you want to reset all settings to default?')) {
      await resetSettings();
      await loadSettings();
    }
  };

  const tabs = [
    { id: 'general', label: 'General', icon: Globe },
    { id: 'apiKeys', label: 'API Keys', icon: Key },
    { id: 'video', label: 'Video', icon: Video },
    { id: 'upload', label: 'Upload', icon: Download },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'security', label: 'Security', icon: Shield },
    { id: 'storage', label: 'Storage', icon: Database }
  ];

  const [visibleSecrets, setVisibleSecrets] = useState<Record<string, boolean>>({});
  const [credentialDrafts, setCredentialDrafts] = useState<Record<string, { clientId: string; clientSecret: string; redirectUri: string }> | null>(null);
  type ApiCredentialPlatform = 'instagram' | 'tiktok' | 'youtube' | 'facebook';

  // Keep a local editable draft of API credentials, seeded from settings
  // once they've loaded, so typing doesn't trigger a save on every
  // keystroke (each field only saves on blur / explicit Save click).
  useEffect(() => {
    if (settings?.apiCredentials && !credentialDrafts) {
      setCredentialDrafts(settings.apiCredentials);
    }
  }, [settings?.apiCredentials, credentialDrafts]);

  const handleCredentialFieldChange = (
    platform: ApiCredentialPlatform,
    field: 'clientId' | 'clientSecret' | 'redirectUri',
    value: string
  ) => {
    setCredentialDrafts(prev => ({
      ...(prev as any),
      [platform]: {
        ...(prev as any)?.[platform],
        [field]: value
      }
    }));
  };

  const handleSaveCredentials = async (platform: ApiCredentialPlatform) => {
    if (!credentialDrafts) return;
    await updateSetting('apiCredentials', platform, credentialDrafts[platform]);
    toast.success(`${platform.charAt(0).toUpperCase() + platform.slice(1)} API credentials saved`);
  };

  const toggleSecretVisibility = (key: string) => {
    setVisibleSecrets(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const platformDeveloperLinks: Record<string, { label: string; url: string; instructions: string }> = {
    instagram: {
      label: 'Meta for Developers',
      url: 'https://developers.facebook.com/apps/',
      instructions: 'Create an app, add the "Instagram Graph API" product, and copy the Client ID / Client Secret from App Settings > Basic.'
    },
    tiktok: {
      label: 'TikTok for Developers',
      url: 'https://developers.tiktok.com/apps/',
      instructions: 'Register an app under "Manage apps", then copy the Client Key (use as Client ID) and Client Secret.'
    },
    youtube: {
      label: 'Google Cloud Console',
      url: 'https://console.cloud.google.com/apis/credentials',
      instructions: 'Create an OAuth 2.0 Client ID (type: Desktop app), enable the YouTube Data API v3, and copy the Client ID / Client Secret.'
    },
    facebook: {
      label: 'Meta for Developers',
      url: 'https://developers.facebook.com/apps/',
      instructions: 'Create an app (or reuse your Instagram app), add the "Facebook Login" and "Pages API" products, and copy the App ID (use as Client ID) / App Secret from Settings > Basic.'
    }
  };

  const renderApiKeysSettings = () => {
    if (!credentialDrafts) return null;

    const platformList: ApiCredentialPlatform[] = ['instagram', 'facebook', 'tiktok', 'youtube'];

    return (
      <div className="space-y-6">
        <div className="bg-muted/50 rounded-lg p-4">
          <p className="text-sm text-muted-foreground">
            Enter your own developer credentials for each platform below. These are
            required before you can connect an account on the{' '}
            <span className="font-medium text-foreground">Social Accounts</span> page.
            Credentials are saved locally and encrypted at rest; they are never sent
            anywhere except directly to the platform you're authenticating with.
          </p>
          <a
            href="https://github.com/raj87verma/reelshare/blob/main/API_KEYS_GUIDE.md"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-primary hover:underline flex items-center space-x-1 mt-2"
          >
            <span>Full step-by-step guide for getting each platform's API keys</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>

        {platformList.map((platform) => {
          const draft = credentialDrafts[platform];
          const devInfo = platformDeveloperLinks[platform];
          const secretKey = `${platform}-secret`;

          return (
            <div key={platform} className="border border-border rounded-xl p-5">
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-lg font-medium text-foreground capitalize">{platform}</h4>
                <a
                  href={devInfo.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-primary hover:underline flex items-center space-x-1"
                >
                  <span>{devInfo.label}</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>

              <p className="text-xs text-muted-foreground mb-4">{devInfo.instructions}</p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Client ID
                  </label>
                  <input
                    type="text"
                    value={draft.clientId}
                    onChange={(e) => handleCredentialFieldChange(platform, 'clientId', e.target.value)}
                    onBlur={() => handleSaveCredentials(platform)}
                    placeholder="Enter Client ID"
                    className="w-full px-4 py-2 bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary font-mono text-sm"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Client Secret
                  </label>
                  <div className="relative">
                    <input
                      type={visibleSecrets[secretKey] ? 'text' : 'password'}
                      value={draft.clientSecret}
                      onChange={(e) => handleCredentialFieldChange(platform, 'clientSecret', e.target.value)}
                      onBlur={() => handleSaveCredentials(platform)}
                      placeholder="Enter Client Secret"
                      className="w-full px-4 py-2 pr-10 bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary font-mono text-sm"
                    />
                    <button
                      type="button"
                      onClick={() => toggleSecretVisibility(secretKey)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {visibleSecrets[secretKey] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Redirect URI
                  </label>
                  <input
                    type="text"
                    value={draft.redirectUri}
                    onChange={(e) => handleCredentialFieldChange(platform, 'redirectUri', e.target.value)}
                    onBlur={() => handleSaveCredentials(platform)}
                    placeholder="http://localhost:3000/auth/callback"
                    className="w-full px-4 py-2 bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary font-mono text-sm"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Must exactly match the redirect URI registered in your {devInfo.label} app settings.
                  </p>
                </div>
              </div>

              <div className="mt-4 flex items-center justify-between">
                <span className={`text-xs font-medium ${draft.clientId && draft.clientSecret ? 'text-green-600' : 'text-muted-foreground'}`}>
                  {draft.clientId && draft.clientSecret ? '✓ Configured' : 'Not configured'}
                </span>
                <button
                  onClick={() => handleSaveCredentials(platform)}
                  className="px-3 py-1.5 bg-primary/10 text-primary text-sm font-medium rounded-lg hover:bg-primary/20 transition-colors"
                >
                  Save {platform.charAt(0).toUpperCase() + platform.slice(1)} Credentials
                </button>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const renderGeneralSettings = () => {
    if (!settings?.general) return null;
    
    return (
      <div className="space-y-6">
        <div>
          <h4 className="text-lg font-medium text-foreground mb-4">Appearance</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Theme
              </label>
              <div className="flex space-x-4">
                <button
                  onClick={() => handleSettingChange('general', 'theme', 'light')}
                  className={`flex items-center space-x-2 px-4 py-2 rounded-lg border transition-colors ${
                    settings.general.theme === 'light'
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border hover:bg-muted'
                  }`}
                >
                  <Sun className="w-4 h-4" />
                  <span>Light</span>
                </button>
                <button
                  onClick={() => handleSettingChange('general', 'theme', 'dark')}
                  className={`flex items-center space-x-2 px-4 py-2 rounded-lg border transition-colors ${
                    settings.general.theme === 'dark'
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border hover:bg-muted'
                  }`}
                >
                  <Moon className="w-4 h-4" />
                  <span>Dark</span>
                </button>
                <button
                  onClick={() => handleSettingChange('general', 'theme', 'system')}
                  className={`flex items-center space-x-2 px-4 py-2 rounded-lg border transition-colors ${
                    settings.general.theme === 'system'
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border hover:bg-muted'
                  }`}
                >
                  <Globe className="w-4 h-4" />
                  <span>System</span>
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Language
              </label>
              <select
                value={settings.general.language || 'en'}
                onChange={(e) => handleSettingChange('general', 'language', e.target.value)}
                className="w-full px-4 py-2 bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              >
                <option value="en">English</option>
                <option value="es">Spanish</option>
                <option value="fr">French</option>
                <option value="de">German</option>
                <option value="ja">Japanese</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Timezone
              </label>
              <select
                value={settings.general.timezone || 'UTC'}
                onChange={(e) => handleSettingChange('general', 'timezone', e.target.value)}
                className="w-full px-4 py-2 bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              >
                <option value="UTC">UTC</option>
                <option value="EST">Eastern Time (EST)</option>
                <option value="PST">Pacific Time (PST)</option>
                <option value="CET">Central European Time (CET)</option>
                <option value="JST">Japan Standard Time (JST)</option>
              </select>
            </div>
          </div>
        </div>

        <div>
          <h4 className="text-lg font-medium text-foreground mb-4">Behavior</h4>
          <div className="space-y-4">
            <label className="flex items-center justify-between">
              <div>
                <span className="font-medium text-foreground">Start with system</span>
                <p className="text-sm text-muted-foreground">Launch ReelShare when your computer starts</p>
              </div>
              <input
                type="checkbox"
                checked={settings.general.autoStart || false}
                onChange={(e) => handleSettingChange('general', 'autoStart', e.target.checked)}
                className="rounded border-input"
              />
            </label>

            <label className="flex items-center justify-between">
              <div>
                <span className="font-medium text-foreground">Minimize to tray</span>
                <p className="text-sm text-muted-foreground">Minimize to system tray instead of closing</p>
              </div>
              <input
                type="checkbox"
                checked={settings.general.minimizeToTray !== false}
                onChange={(e) => handleSettingChange('general', 'minimizeToTray', e.target.checked)}
                className="rounded border-input"
              />
            </label>

            <label className="flex items-center justify-between">
              <div>
                <span className="font-medium text-foreground">Check for updates</span>
                <p className="text-sm text-muted-foreground">Automatically check for application updates</p>
              </div>
              <input
                type="checkbox"
                checked={settings.general.checkForUpdates !== false}
                onChange={(e) => handleSettingChange('general', 'checkForUpdates', e.target.checked)}
                className="rounded border-input"
              />
            </label>
          </div>
        </div>
      </div>
    );
  };

  const renderVideoSettings = () => {
    if (!settings?.video) return null;
    
    return (
      <div className="space-y-6">
        <div>
          <h4 className="text-lg font-medium text-foreground mb-4">Video Processing</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Default Video Quality
              </label>
              <select
                value={settings.video.defaultQuality || 'high'}
                onChange={(e) => handleSettingChange('video', 'defaultQuality', e.target.value)}
                className="w-full px-4 py-2 bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              >
                <option value="low">Low (480p)</option>
                <option value="medium">Medium (720p)</option>
                <option value="high">High (1080p)</option>
                <option value="original">Original Quality</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Maximum File Size (MB)
              </label>
              <input
                type="number"
                value={settings.video.maxFileSize || 500}
                onChange={(e) => handleSettingChange('video', 'maxFileSize', parseInt(e.target.value))}
                className="w-full px-4 py-2 bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                min="10"
                max="10000"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Maximum Video Duration (minutes)
              </label>
              <input
                type="number"
                value={Math.round((settings.video.maxDurationSeconds ?? 1800) / 60)}
                onChange={(e) => handleSettingChange('video', 'maxDurationSeconds', Math.max(1, parseInt(e.target.value) || 1) * 60)}
                className="w-full px-4 py-2 bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                min="1"
                max="720"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Videos longer than this are rejected at upload time. Individual platforms
                may enforce their own (usually shorter) limit when publishing.
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Thumbnail Generation Time (seconds)
              </label>
              <input
                type="number"
                value={settings.video.thumbnailTime || 5}
                onChange={(e) => handleSettingChange('video', 'thumbnailTime', parseInt(e.target.value))}
                className="w-full px-4 py-2 bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                min="1"
                max="300"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Compression Quality (%)
              </label>
              <input
                type="range"
                value={settings.video.compressionQuality || 80}
                onChange={(e) => handleSettingChange('video', 'compressionQuality', parseInt(e.target.value))}
                className="w-full"
                min="1"
                max="100"
              />
              <div className="text-sm text-muted-foreground text-center">
                {settings.video.compressionQuality || 80}% 
                {(settings.video.compressionQuality || 80) >= 80 ? ' (High Quality)' :
                 (settings.video.compressionQuality || 80) >= 60 ? ' (Balanced)' : ' (Maximum Compression)'}
              </div>
            </div>
          </div>
        </div>

        <div>
          <h4 className="text-lg font-medium text-foreground mb-4">Processing Options</h4>
          <div className="space-y-4">
            <label className="flex items-center justify-between">
              <div>
                <span className="font-medium text-foreground">Auto-generate thumbnails</span>
                <p className="text-sm text-muted-foreground">Generate thumbnails automatically for uploaded videos</p>
              </div>
              <input
                type="checkbox"
                checked={settings.video.autoGenerateThumbnails !== false}
                onChange={(e) => handleSettingChange('video', 'autoGenerateThumbnails', e.target.checked)}
                className="rounded border-input"
              />
            </label>

            <label className="flex items-center justify-between">
              <div>
                <span className="font-medium text-foreground">Auto-compression</span>
                <p className="text-sm text-muted-foreground">Compress videos automatically to save space</p>
              </div>
              <input
                type="checkbox"
                checked={settings.video.autoCompression !== false}
                onChange={(e) => handleSettingChange('video', 'autoCompression', e.target.checked)}
                className="rounded border-input"
              />
            </label>

            <label className="flex items-center justify-between">
              <div>
                <span className="font-medium text-foreground">Keep original files</span>
                <p className="text-sm text-muted-foreground">Keep original video files after processing</p>
              </div>
              <input
                type="checkbox"
                checked={settings.video.keepOriginalFiles !== false}
                onChange={(e) => handleSettingChange('video', 'keepOriginalFiles', e.target.checked)}
                className="rounded border-input"
              />
            </label>
          </div>
        </div>
      </div>
    );
  };

  const renderUploadSettings = () => {
    if (!settings?.upload) return null;
    
    return (
      <div className="space-y-6">
        <div>
          <h4 className="text-lg font-medium text-foreground mb-4">Upload Configuration</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Concurrent Uploads
              </label>
              <input
                type="number"
                value={settings.upload.concurrentUploads || 3}
                onChange={(e) => handleSettingChange('upload', 'concurrentUploads', parseInt(e.target.value))}
                className="w-full px-4 py-2 bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                min="1"
                max="10"
              />
              <p className="text-sm text-muted-foreground mt-1">
                Number of uploads to process simultaneously
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Maximum Retry Attempts
              </label>
              <input
                type="number"
                value={settings.upload.maxRetries || 3}
                onChange={(e) => handleSettingChange('upload', 'maxRetries', parseInt(e.target.value))}
                className="w-full px-4 py-2 bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                min="0"
                max="10"
              />
            </div>
          </div>
        </div>

        <div>
          <h4 className="text-lg font-medium text-foreground mb-4">Upload Behavior</h4>
          <div className="space-y-4">
            <label className="flex items-center justify-between">
              <div>
                <span className="font-medium text-foreground">Retry failed uploads</span>
                <p className="text-sm text-muted-foreground">Automatically retry failed uploads</p>
              </div>
              <input
                type="checkbox"
                checked={settings.upload.retryFailedUploads !== false}
                onChange={(e) => handleSettingChange('upload', 'retryFailedUploads', e.target.checked)}
                className="rounded border-input"
              />
            </label>

            <label className="flex items-center justify-between">
              <div>
                <span className="font-medium text-foreground">Notify on completion</span>
                <p className="text-sm text-muted-foreground">Send notification when uploads complete</p>
              </div>
              <input
                type="checkbox"
                checked={settings.upload.notifyOnComplete !== false}
                onChange={(e) => handleSettingChange('upload', 'notifyOnComplete', e.target.checked)}
                className="rounded border-input"
              />
            </label>

            <label className="flex items-center justify-between">
              <div>
                <span className="font-medium text-foreground">Notify on failure</span>
                <p className="text-sm text-muted-foreground">Send notification when uploads fail</p>
              </div>
              <input
                type="checkbox"
                checked={settings.upload.notifyOnFailure !== false}
                onChange={(e) => handleSettingChange('upload', 'notifyOnFailure', e.target.checked)}
                className="rounded border-input"
              />
            </label>
          </div>
        </div>
      </div>
    );
  };

  const renderTabContent = () => {
    if (loading) {
      return (
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-muted-foreground">Loading settings...</p>
          </div>
        </div>
      );
    }

    switch (activeTab) {
      case 'general':
        return renderGeneralSettings();
      case 'apiKeys':
        return renderApiKeysSettings();
      case 'video':
        return renderVideoSettings();
      case 'upload':
        return renderUploadSettings();
      case 'notifications':
        return (
          <div className="space-y-6">
            <h4 className="text-lg font-medium text-foreground mb-4">Notification Settings</h4>
            <p className="text-muted-foreground">Notification settings coming soon...</p>
          </div>
        );
      case 'security':
        return (
          <div className="space-y-6">
            <h4 className="text-lg font-medium text-foreground mb-4">Security Settings</h4>
            <p className="text-muted-foreground">Security settings coming soon...</p>
          </div>
        );
      case 'storage':
        return (
          <div className="space-y-6">
            <h4 className="text-lg font-medium text-foreground mb-4">Storage Settings</h4>
            <p className="text-muted-foreground">Storage settings coming soon...</p>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-foreground">Settings</h2>
        <p className="text-muted-foreground mt-1">
          Configure your ReelShare application preferences
        </p>
      </div>

      {/* User Profile */}
      <div className="bg-card border border-border rounded-xl p-6">
        <div className="flex items-center space-x-4">
          <div className="w-16 h-16 bg-gradient-to-r from-primary to-pink-500 rounded-full flex items-center justify-center">
            <User className="w-8 h-8 text-white" />
          </div>
          <div className="flex-1">
            <h3 className="text-xl font-bold text-foreground">{user?.name || 'User'}</h3>
            <p className="text-muted-foreground">{user?.email || 'user@example.com'}</p>
            <p className="text-sm text-primary mt-1">
              {user?.plan ? user.plan.charAt(0).toUpperCase() + user.plan.slice(1) + ' Plan' : 'Free Plan'}
            </p>
          </div>
          <button className="px-4 py-2 border border-border rounded-lg hover:bg-muted transition-colors">
            Edit Profile
          </button>
        </div>
      </div>

      {/* Main Settings */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Sidebar */}
        <div className="lg:col-span-1">
          <div className="bg-card border border-border rounded-xl p-4">
            <nav className="space-y-1">
              {tabs.map(tab => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`
                      w-full flex items-center space-x-3 p-3 rounded-lg transition-colors text-left
                      ${activeTab === tab.id
                        ? 'bg-primary text-primary-foreground'
                        : 'text-foreground hover:bg-muted'
                      }
                    `}
                  >
                    <Icon className="w-5 h-5" />
                    <span className="font-medium">{tab.label}</span>
                  </button>
                );
              })}
            </nav>

            {/* Data Management */}
            <div className="mt-8 pt-6 border-t border-border">
              <h5 className="text-sm font-medium text-foreground mb-3">Data Management</h5>
              <div className="space-y-2">
                <button
                  onClick={handleExportData}
                  className="w-full flex items-center space-x-2 p-2 text-sm text-foreground hover:bg-muted rounded-lg transition-colors"
                >
                  <Download className="w-4 h-4" />
                  <span>Export Data</span>
                </button>
                <button
                  onClick={handleImportData}
                  className="w-full flex items-center space-x-2 p-2 text-sm text-foreground hover:bg-muted rounded-lg transition-colors"
                >
                  <span>📥</span>
                  <span>Import Data</span>
                </button>
                <button
                  onClick={handleResetSettings}
                  className="w-full flex items-center space-x-2 p-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                >
                  <span>🔄</span>
                  <span>Reset Settings</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="lg:col-span-3">
          <div className="bg-card border border-border rounded-xl p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-foreground">
                {tabs.find(t => t.id === activeTab)?.label} Settings
              </h3>
              <button
                onClick={handleSaveSettings}
                className="bg-primary text-primary-foreground font-medium py-2 px-4 rounded-lg hover:bg-primary/90 transition-colors flex items-center space-x-2"
              >
                <Save className="w-4 h-4" />
                <span>Save Changes</span>
              </button>
            </div>

            {renderTabContent()}

            {/* Footer */}
            <div className="mt-8 pt-6 border-t border-border">
              <div className="flex items-center justify-between">
                <div>
                  <h5 className="font-medium text-foreground">Application Info</h5>
                  <p className="text-sm text-muted-foreground">
                    Version 1.0.0 • Built with Electron & React
                  </p>
                </div>
                <div className="text-sm text-muted-foreground">
                  <p>Last updated: {new Date().toLocaleDateString()}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-card border border-border rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Storage Used</p>
              <p className="text-2xl font-bold text-foreground mt-1">1.2 GB</p>
            </div>
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <Database className="w-5 h-5 text-blue-600" />
            </div>
          </div>
        </div>
        
        <div className="bg-card border border-border rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Cache Size</p>
              <p className="text-2xl font-bold text-foreground mt-1">256 MB</p>
            </div>
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <Video className="w-5 h-5 text-green-600" />
            </div>
          </div>
        </div>
        
        <div className="bg-card border border-border rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Settings</p>
              <p className="text-2xl font-bold text-foreground mt-1">42</p>
              <p className="text-xs text-muted-foreground">configurations</p>
            </div>
            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
              <Globe className="w-5 h-5 text-purple-600" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;