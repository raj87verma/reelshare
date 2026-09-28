const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
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