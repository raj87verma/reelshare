import { app, BrowserWindow, ipcMain, dialog, shell, Tray, Menu, nativeImage } from 'electron';
import path from 'path';
import fs from 'fs';
import { initDatabase } from './database';
import { initScheduler } from './scheduler';
import { initVideoProcessor } from './video-processor';
import { initPlatformManager } from './social-platforms/manager';
import { initConfigService } from './config';

// Note: we package with electron-builder (NSIS on Windows), which handles
// installer/uninstaller shortcuts itself. electron-squirrel-startup is only
// needed for electron-forge's Squirrel.Windows target, which we don't use.

let mainWindow: BrowserWindow | null = null;
let tray: Tray | null = null;

const createWindow = () => {
  // Create the browser window.
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    icon: path.join(__dirname, '../../assets/icon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
    titleBarStyle: 'hiddenInset',
    frame: process.platform !== 'darwin',
  });

  // and load the index.html of the app.
  // In development, the Vite dev server (npm run dev:react) serves the app
  // on localhost:3000. In production (packaged app), load the built static
  // file directly. app.isPackaged is Electron's own reliable signal for
  // this, unlike the electron-forge-specific globals used previously,
  // which are only replaced at build time by @electron-forge/plugin-vite
  // and are otherwise undefined at runtime with a plain tsc build,
  // throwing a ReferenceError that silently killed window loading.
  if (!app.isPackaged) {
    mainWindow.loadURL('http://localhost:3000');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
  }

  // Create system tray. Wrapped in try/catch: this runs inside the promise
  // chain kicked off by app.whenReady().then(createWindow), so an uncaught
  // exception here (e.g. a missing/corrupt tray icon file) would silently
  // reject that promise. Electron does not show an error dialog for
  // unhandled promise rejections the way it does for synchronous uncaught
  // exceptions, so the window would already exist (hence a blank/default
  // window) but never proceed to load its content. A failed tray is not
  // fatal to the app, so we log and continue instead of crashing.
  try {
    createTray();
  } catch (error) {
    console.error('Failed to create system tray (continuing without it):', error);
  }

  // Initialize services
  initDatabase();
  initScheduler();
  initVideoProcessor();
  initPlatformManager();
  initConfigService();

  // Handle external links
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http')) {
      shell.openExternal(url);
      return { action: 'deny' };
    }
    return { action: 'allow' };
  });
};

const createTray = () => {
  const iconPath = path.join(__dirname, '../../assets/tray-icon.png');
  const trayIcon = nativeImage.createFromPath(iconPath);
  
  tray = new Tray(trayIcon.resize({ width: 16, height: 16 }));
  
  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Show App',
      click: () => {
        if (mainWindow) {
          mainWindow.show();
          mainWindow.focus();
        }
      }
    },
    {
      label: 'Upload Video',
      click: () => {
        if (mainWindow) {
          mainWindow.webContents.send('tray-action', 'upload-video');
          mainWindow.show();
          mainWindow.focus();
        }
      }
    },
    { type: 'separator' },
    {
      label: 'Quit',
      click: () => {
        app.quit();
      }
    }
  ]);

  tray.setToolTip('ReelShare - Video Manager');
  tray.setContextMenu(contextMenu);

  tray.on('click', () => {
    if (mainWindow) {
      mainWindow.show();
      mainWindow.focus();
    }
  });
};

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
//
// The .catch() here is a deliberate safety net: any uncaught exception
// inside createWindow() (or anything it calls) rejects this promise.
// Electron does NOT show its "A JavaScript error occurred in the main
// process" dialog for unhandled promise rejections the way it does for
// synchronous top-level exceptions -- the app just silently ends up with
// a window that opened but never loaded content (a blank white screen)
// or, if the window itself failed, with a fully hung process. Surfacing
// the error explicitly here means future bugs in this chain fail loudly
// instead of silently, which is exactly the failure mode that shipped in
// v1.0.2 (a leftover electron-forge-only global reference in createWindow
// threw a ReferenceError that nobody could see).
app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
}).catch((error) => {
  console.error('Fatal error during app startup:', error);
  dialog.showErrorBox(
    'ReelShare failed to start',
    `An error occurred while starting the application:\n\n${error?.stack || error}`
  );
  app.quit();
});

// Quit when all windows are closed, except on macOS.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// IPC Handlers
ipcMain.handle('dialog:openFile', async () => {
  if (!mainWindow) return null;
  
  const { canceled, filePaths } = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile'],
    filters: [
      { name: 'Video Files', extensions: ['mp4', 'mov', 'avi', 'mkv', 'webm'] },
      { name: 'All Files', extensions: ['*'] }
    ]
  });
  
  if (!canceled && filePaths.length > 0) {
    return filePaths[0];
  }
  return null;
});

ipcMain.handle('dialog:openDirectory', async () => {
  if (!mainWindow) return null;
  
  const { canceled, filePaths } = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory']
  });
  
  if (!canceled && filePaths.length > 0) {
    return filePaths[0];
  }
  return null;
});

// Opens a native "pick a video file" dialog and returns the chosen path
// directly. We use dialog.showOpenDialog (rather than an HTML
// <input type="file"> in the renderer) specifically because it hands back
// a real filesystem path with no extra API needed -- browser File objects
// in a contextIsolated renderer have no durable path the main process's
// video processor (ffmpeg) or SQLite file_path column can use once the
// picker closes. This also avoids relying on the deprecated (and removed
// in Electron 32+) File.path extension.
ipcMain.handle('video:pickFile', async () => {
  if (!mainWindow) return null;

  const { canceled, filePaths } = await dialog.showOpenDialog(mainWindow, {
    title: 'Select a video to upload',
    properties: ['openFile'],
    filters: [
      { name: 'Video Files', extensions: ['mp4', 'mov', 'avi', 'mkv', 'webm'] }
    ]
  });

  if (canceled || filePaths.length === 0) return null;
  return filePaths[0];
});

// Copies a picked video into ReelShare's permanent per-user storage
// directory (userData/videos), returning the new, stable path. Videos
// stay wherever the user originally had them selectable from, but ReelShare
// needs its own persistent copy: the original file could be renamed,
// moved, or deleted (e.g. it was on a USB drive or Downloads folder that
// gets cleaned up) without ReelShare losing access to it.
ipcMain.handle('video:saveFile', async (_, sourcePath: string, fileName: string) => {
  const videosDir = path.join(app.getPath('userData'), 'videos');
  if (!fs.existsSync(videosDir)) {
    fs.mkdirSync(videosDir, { recursive: true });
  }

  const ext = path.extname(fileName) || path.extname(sourcePath) || '.mp4';
  const baseName = path.basename(fileName, path.extname(fileName)) || 'video';
  const uniqueName = `${baseName}_${Date.now()}${ext}`;
  const destPath = path.join(videosDir, uniqueName);

  await fs.promises.copyFile(sourcePath, destPath);

  return destPath;
});

ipcMain.handle('file:exists', async (_, filePath: string) => {
  return fs.existsSync(filePath);
});

ipcMain.handle('file:read', async (_, filePath: string) => {
  return fs.readFileSync(filePath, 'utf-8');
});

ipcMain.handle('file:write', async (_, filePath: string, data: string) => {
  fs.writeFileSync(filePath, data);
  return true;
});

ipcMain.handle('file:delete', async (_, filePath: string) => {
  fs.unlinkSync(filePath);
  return true;
});

ipcMain.handle('app:getVersion', () => {
  return app.getVersion();
});

ipcMain.handle('app:getPath', (_, name: string) => {
  return app.getPath(name as any);
});

// App lifecycle events
app.on('before-quit', () => {
  // Cleanup resources before quitting
  if (mainWindow) {
    mainWindow.webContents.send('app:before-quit');
  }
});