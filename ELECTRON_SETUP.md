# Electron Setup for macOS - Complete Guide

## ✅ What's Been Set Up

1. ✅ **Electron installed** (`electron` and `electron-builder`)
2. ✅ **Main process file created** (`electron/main.js`)
3. ✅ **Package.json updated** with Electron scripts
4. ✅ **Electron-builder config** (`electron-builder.yml`)

## 🚀 Quick Start

### Run Electron App Locally

```bash
npm run electron:dev
```

This will:
- Open an Electron window
- Load `https://usesitrep.com`
- Show your app running as a desktop app

### Build macOS App

```bash
npm run electron:build
```

This will:
- Create a `.dmg` file in the `dist/` folder
- Package your app for macOS (Intel + Apple Silicon)
- Ready to distribute!

## 📁 File Structure

```
get-shit-done/
├── electron/
│   └── main.js          # Electron main process
├── electron-builder.yml # Build configuration
└── package.json         # Updated with Electron scripts
```

## 🎯 Available Scripts

- `npm run electron:dev` - Run Electron app in development mode
- `npm run electron:build` - Build macOS app (.dmg)
- `npm run electron:build:all` - Build for Mac, Windows, and Linux

## 🔧 Configuration

### Main Process (`electron/main.js`)

The main process:
- Creates the browser window
- Loads `https://usesitrep.com`
- Handles window lifecycle
- Opens external links in default browser
- Security settings enabled

### Build Config (`electron-builder.yml`)

- **App ID**: `com.yossivaknin.sitrep`
- **Product Name**: `SITREP`
- **Target**: macOS DMG (Intel + Apple Silicon)
- **Category**: Productivity

## 🎨 Customization

### Change Window Size

Edit `electron/main.js`:
```javascript
mainWindow = new BrowserWindow({
  width: 1200,  // Change this
  height: 800,  // Change this
  // ...
});
```

### Change App Icon

1. Create icon files:
   - `build/icon.icns` (macOS)
   - `build/icon.ico` (Windows)
   - `build/icon.png` (Linux)

2. Update `electron-builder.yml` if needed

### Change Production URL

Edit `electron/main.js`:
```javascript
mainWindow.loadURL('https://usesitrep.com'); // Change this
```

## 📦 Distribution

### For macOS

1. **Build the app:**
   ```bash
   npm run electron:build
   ```

2. **Find the DMG:**
   - Location: `dist/SITREP-0.1.1.dmg`
   - This is a distributable macOS app installer

3. **Distribute:**
   - Share the DMG file
   - Users can drag the app to Applications
   - Or submit to Mac App Store (requires additional setup)

### For Mac App Store

1. **Code sign the app** (requires Apple Developer account)
2. **Create app-specific password**
3. **Update `electron-builder.yml`** with App Store settings
4. **Build and submit**

## 🔒 Security

The Electron app is configured with:
- ✅ `nodeIntegration: false` - Prevents Node.js access from renderer
- ✅ `contextIsolation: true` - Isolates context
- ✅ `webSecurity: true` - Enables web security
- ✅ External links open in default browser

## 🐛 Troubleshooting

### Issue: "Cannot find module 'electron'"

**Fix:**
```bash
npm install
```

### Issue: Window doesn't load

**Check:**
1. Is `https://usesitrep.com` accessible?
2. Check console for errors: `npm run electron:dev` (DevTools open automatically)

### Issue: Build fails

**Fix:**
1. Make sure all dependencies are installed: `npm install`
2. Check `electron-builder.yml` syntax
3. Try cleaning: `rm -rf dist/` then rebuild

### Issue: App is too large

**Fix:**
- Electron apps are typically 100-200MB
- This is normal for Electron apps
- Consider code splitting or optimization if needed

## ✅ Testing Checklist

Before distributing:

- [ ] App launches successfully
- [ ] Window loads `https://usesitrep.com`
- [ ] Login works
- [ ] OAuth works
- [ ] All features function correctly
- [ ] External links open in browser
- [ ] Window can be resized
- [ ] App quits properly

## 🎉 You're Ready!

Your Electron app is set up and ready to use!

**Next Steps:**
1. Test locally: `npm run electron:dev`
2. Build for distribution: `npm run electron:build`
3. Share the DMG file with users

The app will work exactly like your web app, but as a native macOS desktop application!

