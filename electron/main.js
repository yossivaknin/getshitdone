const { app, BrowserWindow } = require('electron');
const path = require('path');

// Set app name
app.setName('SITREP');

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    backgroundColor: '#0F0F0F',
    title: 'SITREP', // Window title
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: true,
      allowRunningInsecureContent: false,
    },
    titleBarStyle: 'hiddenInset', // macOS style
    show: false, // Don't show until ready
  });

  // Load your production server
  mainWindow.loadURL('https://usesitrep.com');

  // Show window when ready to prevent visual flash
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    
    // Focus the window
    if (process.platform === 'darwin') {
      app.dock.show();
    }
  });

  // Handle window closed
  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Open DevTools in development (optional)
  if (process.env.NODE_ENV === 'development') {
    mainWindow.webContents.openDevTools();
  }
}

// App event handlers
app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    // On macOS, re-create window when dock icon is clicked
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

// Quit when all windows are closed (except on macOS)
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// Security: Prevent new window creation
app.on('web-contents-created', (event, contents) => {
  contents.on('new-window', (event, navigationUrl) => {
    event.preventDefault();
    // Open in external browser instead
    require('electron').shell.openExternal(navigationUrl);
  });
});

// Handle external links
app.on('web-contents-created', (event, contents) => {
  contents.setWindowOpenHandler(({ url }) => {
    // Open external URLs in default browser
    if (url.startsWith('http') && !url.includes('usesitrep.com')) {
      require('electron').shell.openExternal(url);
      return { action: 'deny' };
    }
    // Allow same-origin navigation
    return { action: 'allow' };
  });
});

