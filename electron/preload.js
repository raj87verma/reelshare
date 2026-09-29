const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // Authentication
  auth: {
    register: (email, name, password) => ipcRenderer.invoke('auth:register', email, name, password),
    login: (email, password) => ipcRenderer.invoke('auth:login', email, password),
    logout: () => ipcRenderer.invoke('auth:logout'),
    getCurrentUser: () => ipcRenderer.invoke('auth:getCurrentUser')
  },

  // Social platform connections (real OAuth via the system browser + a
  // local loopback redirect, see electron/oauth-loopback.ts) and
  // publishing, backed by the social_accounts table in SQLite.
  platforms: {
    authenticate: (userId, platformType, credentials) => ipcRenderer.invoke('platforms:authenticate', userId, platformType, credentials),
    getAllStatuses: (userId) => ipcRenderer.invoke('platforms:getAllStatuses', userId),
    disconnect: (userId, platformType) => ipcRenderer.invoke('platforms:disconnect', userId, platformType),
    refreshToken: (userId, platformType) => ipcRenderer.invoke('platforms:refreshToken', userId, platformType),
    upload: (userId, platformType, video, metadata) => ipcRenderer.invoke('platforms:upload', userId, platformType, video, metadata),
    schedule: (userId, platformType, video, scheduleTime) => ipcRenderer.invoke('platforms:schedule', userId, platformType, video, scheduleTime),
    getAnalytics: (userId, platformType, postId) => ipcRenderer.invoke('platforms:getAnalytics', userId, platformType, postId)
  },

  // Scheduled posts (persisted via SQLite + electron/scheduler.ts's
  // background cron jobs in the main process).
  scheduler: {
    schedulePost: (postData) => ipcRenderer.invoke('scheduler:schedulePost', postData),
    cancelPost: (postId) => ipcRenderer.invoke('scheduler:cancelPost', postId),
    reschedulePost: (postId, newTime) => ipcRenderer.invoke('scheduler:reschedulePost', postId, newTime),
    getPendingPosts: (userId, limit) => ipcRenderer.invoke('scheduler:getPendingPosts', userId, limit)
  },

  // Direct database reads for scheduled posts (joins video/account info --
  // see db:getScheduledPosts in electron/database.ts). Used for statuses
  // beyond just "pending" (published/failed/processing), which
  // scheduler:getPendingPosts intentionally doesn't return.
  db: {
    getScheduledPosts: (userId, status, limit) => ipcRenderer.invoke('db:getScheduledPosts', userId, status, limit),
    getSocialAccounts: (userId) => ipcRenderer.invoke('db:getSocialAccounts', userId),
    createSocialAccount: (accountData) => ipcRenderer.invoke('db:createSocialAccount', accountData)
  },

  // Video library (persisted via SQLite in the main process)
  videos: {
    create: (videoData) => ipcRenderer.invoke('db:createVideo', videoData),
    getAll: (userId) => ipcRenderer.invoke('db:getVideos', userId),
    get: (videoId) => ipcRenderer.invoke('db:getVideo', videoId),
    update: (videoId, updates) => ipcRenderer.invoke('db:updateVideo', videoId, updates),
    delete: (videoId) => ipcRenderer.invoke('db:deleteVideo', videoId),
    // Opens a native file picker and returns the chosen path directly
    // (see video:pickFile in main.ts for why this is used instead of an
    // HTML <input type="file">).
    pickFile: () => ipcRenderer.invoke('video:pickFile'),
    // Copies a picked file into the app's permanent storage directory,
    // returning the real, stable filesystem path.
    saveFile: (sourcePath, fileName) => ipcRenderer.invoke('video:saveFile', sourcePath, fileName),
    getMetadata: (filePath) => ipcRenderer.invoke('video:getMetadata', filePath),
    generateThumbnail: (filePath, timestamp) => ipcRenderer.invoke('video:generateThumbnail', filePath, timestamp)
  },

  // Dialog methods
  openFile: () => ipcRenderer.invoke('dialog:openFile'),
  openDirectory: () => ipcRenderer.invoke('dialog:openDirectory'),
  
  // File operations
  fileExists: (path) => ipcRenderer.invoke('file:exists', path),
  readFile: (path) => ipcRenderer.invoke('file:read', path),
  writeFile: (path, data) => ipcRenderer.invoke('file:write', path, data),
  deleteFile: (path) => ipcRenderer.invoke('file:delete', path),
  
  // App info
  getVersion: () => ipcRenderer.invoke('app:getVersion'),
  getPath: (name) => ipcRenderer.invoke('app:getPath', name),
  
  // Events
  onTrayAction: (callback) => ipcRenderer.on('tray-action', (_, action) => callback(action)),
  onAppBeforeQuit: (callback) => ipcRenderer.on('app:before-quit', () => callback()),
  
  // Send events to main process
  sendEvent: (channel, data) => ipcRenderer.send(channel, data),
  
  // Configuration API
  config: {
    getAll: () => ipcRenderer.invoke('config:getAll'),
    get: (path) => ipcRenderer.invoke('config:get', path),
    set: (path, value) => ipcRenderer.invoke('config:set', path, value),
    update: (updates) => ipcRenderer.invoke('config:update', updates),
    reset: () => ipcRenderer.invoke('config:reset'),
    export: () => ipcRenderer.invoke('config:export'),
    import: (json) => ipcRenderer.invoke('config:import', json),
    getPlatform: (platform) => ipcRenderer.invoke('config:getPlatform', platform),
    updatePlatform: (platform, updates) => ipcRenderer.invoke('config:updatePlatform', platform, updates),
    getMaxFileSize: () => ipcRenderer.invoke('config:getMaxFileSize'),
    isFormatSupported: (format) => ipcRenderer.invoke('config:isFormatSupported', format),
    getConcurrentUploads: () => ipcRenderer.invoke('config:getConcurrentUploads'),
    getCaption: (title, description) => ipcRenderer.invoke('config:getCaption', title, description)
  },
  
  // Remove listeners
  removeTrayActionListener: () => ipcRenderer.removeAllListeners('tray-action'),
  removeAppBeforeQuitListener: () => ipcRenderer.removeAllListeners('app:before-quit')
});