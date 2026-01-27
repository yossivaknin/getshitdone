# macOS App Support Guide

## Current Status

**Short Answer**: Capacitor does **NOT** natively support macOS apps. The scripts in `package.json` (`build:macos`, `open:macos`) reference macOS, but Capacitor only supports:
- ✅ iOS
- ✅ Android  
- ✅ Web

## Options for macOS Desktop App

You have **three main options** to create a macOS app:

### Option 1: Electron (Recommended for Desktop)

**Pros:**
- ✅ Mature and widely used
- ✅ Works with your existing Next.js app
- ✅ Can reuse most of your code
- ✅ Good documentation and community support

**Cons:**
- ❌ Larger app size (~100-200MB)
- ❌ Higher memory usage
- ❌ Separate from iOS/Android builds

**Setup:**
```bash
# Install Electron
npm install --save-dev electron electron-builder

# Add to package.json scripts:
"build:electron": "npm run build && electron-builder --mac"
```

**Note**: This requires additional configuration and setup. Your app will work, but you'll need to:
1. Create an Electron main process file
2. Configure electron-builder for macOS
3. Handle window management, menus, etc.

---

### Option 2: Mac Catalyst (iOS App on Mac)

**Pros:**
- ✅ Uses your existing iOS app
- ✅ No additional code needed
- ✅ Smaller app size
- ✅ Native macOS integration

**Cons:**
- ❌ Only works if you have an iOS app
- ❌ Limited to iOS capabilities
- ❌ May not feel fully "native" on Mac

**How to Enable:**
1. Open your iOS project in Xcode: `npm run cap:open:ios`
2. Select your app target
3. Go to **"Signing & Capabilities"** tab
4. Check **"Mac (Designed for iPad)"** or enable **Mac Catalyst**
5. Build for macOS

**Note**: This essentially runs your iOS app on macOS, which works but may have UI/UX limitations.

---

### Option 3: Tauri (Lightweight Alternative)

**Pros:**
- ✅ Much smaller app size (~5-10MB)
- ✅ Lower memory usage
- ✅ Better performance than Electron
- ✅ Native system integration

**Cons:**
- ❌ Requires Rust knowledge (or learning)
- ❌ Less mature ecosystem
- ❌ More complex setup

**Setup:**
```bash
npm install --save-dev @tauri-apps/cli
npx tauri init
```

---

## Recommendation

### For Quick macOS Support:
**Use Mac Catalyst** - Since you already have an iOS app, you can enable it to run on macOS with minimal effort.

### For Full Desktop Experience:
**Use Electron** - Better for a true desktop app experience, but requires more setup.

---

## Will Your App Work on macOS?

**Yes, your app will work**, but you need to choose one of the options above:

1. **If using Mac Catalyst**: Your iOS app will run on macOS (with some UI adjustments)
2. **If using Electron**: Your Next.js app will run in an Electron window (full desktop experience)
3. **If using Tauri**: Your web app will run in a Tauri window (lightweight desktop experience)

---

## Current Configuration

Your `capacitor.config.ts` is already set up to work with production server (`https://usesitrep.com`), which means:

- ✅ **iOS app**: Will work (already configured)
- ✅ **Electron app**: Will work (points to production server)
- ✅ **Tauri app**: Will work (points to production server)
- ✅ **Mac Catalyst**: Will work (uses iOS app)

---

## Next Steps

### If You Want Mac Catalyst (Easiest):

1. Open Xcode: `npm run cap:open:ios`
2. Select your app target
3. Go to **"General"** tab
4. Under **"Deployment Info"**, check **"Mac"** checkbox
5. Build and run

### If You Want Electron (Full Desktop):

1. Install Electron:
   ```bash
   npm install --save-dev electron electron-builder
   ```

2. Create `electron/main.js`:
   ```javascript
   const { app, BrowserWindow } = require('electron');
   const path = require('path');

   function createWindow() {
     const win = new BrowserWindow({
       width: 1200,
       height: 800,
       webPreferences: {
         nodeIntegration: false,
         contextIsolation: true,
       },
     });

     // Load your production server
     win.loadURL('https://usesitrep.com');
   }

   app.whenReady().then(createWindow);
   ```

3. Update `package.json`:
   ```json
   {
     "main": "electron/main.js",
     "scripts": {
       "electron:dev": "electron .",
       "electron:build": "electron-builder --mac"
     }
   }
   ```

4. Build:
   ```bash
   npm run electron:build
   ```

---

## Summary

- ❌ **Capacitor doesn't natively support macOS**
- ✅ **Your app WILL work on macOS** using one of the options above
- 🎯 **Recommended**: Start with Mac Catalyst (easiest), then consider Electron if you need full desktop features

The scripts in your `package.json` (`build:macos`, `open:macos`) won't work as-is because Capacitor doesn't have a macOS platform. You'll need to use one of the alternatives above.

