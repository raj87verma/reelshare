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