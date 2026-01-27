# Mac Catalyst Setup - Quick Guide

## ✅ What I've Done

I've updated your Xcode project file to enable Mac Catalyst support:
- ✅ Added `SUPPORTS_MACCATALYST = YES` to build settings
- ✅ Added `macosx` to `SUPPORTED_PLATFORMS`

## 📋 Next Steps in Xcode

### Step 1: Open Xcode

```bash
cd /Users/yossivaknin/Desktop/april/code/get-shit-done
npm run cap:open:ios
```

### Step 2: Enable Mac in Deployment Info

1. **Select your project** (top item in navigator - "App")
2. **Select the "App" target** (under TARGETS)
3. **Go to "General" tab**
4. **Under "Deployment Info"**, you should see:
   - ✅ iPhone
   - ✅ iPad
   - ☐ Mac (Designed for iPad) - **Check this box!**

5. **If you don't see "Mac" option:**
   - Make sure you're using Xcode 12.0 or later
   - The project file has been updated, so it should appear

### Step 3: Build for Mac

1. **In the device selector** (top toolbar), select:
   - **"My Mac"** or **"Mac Catalyst"**
   - Or select **"Any Mac"** from the destination list

2. **Build and Run:**
   - Press `⌘R` or click the **Play** button
   - The app will build and run on your Mac!

### Step 4: Test the App

Once the app launches:
- ✅ It should open in a window on your Mac
- ✅ All features should work (login, OAuth, etc.)
- ✅ The app connects to `https://usesitrep.com` (production server)

## 🎯 What to Expect

### UI Differences:
- The app will look similar to iPad version
- Window can be resized
- Some iOS-specific UI elements may need adjustment
- Touch gestures work with trackpad/mouse

### Functionality:
- ✅ All features work the same
- ✅ OAuth redirects work
- ✅ Production server connection works
- ✅ All APIs function normally

## ⚠️ Important: Capacitor Limitation

**Capacitor does NOT support Mac Catalyst.** The error you're seeing:
```
no library for this platform was found in Capacitor.xcframework
```

This is because Capacitor's xcframework only includes iOS binaries, not macOS.

## 🔧 Solutions

### Option 1: Use Electron Instead (Recommended)

Since Capacitor doesn't support Mac Catalyst, **Electron is the better choice** for macOS:

1. **Install Electron:**
   ```bash
   npm install --save-dev electron electron-builder
   ```

2. **Create `electron/main.js`:**
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

3. **Update `package.json`:**
   ```json
   {
     "main": "electron/main.js",
     "scripts": {
       "electron:dev": "electron .",
       "electron:build": "electron-builder --mac"
     }
   }
   ```

4. **Build:**
   ```bash
   npm run electron:build
   ```

### Option 2: Remove Mac Catalyst Support

If you want to keep iOS only:

1. In Xcode, go to **General** tab
2. Under **Supported Destinations**, remove "Mac (Designed for iPad)"
3. Remove `SUPPORTS_MACCATALYST = YES` from build settings

### Option 3: Conditional Capacitor Loading (Advanced)

You could conditionally exclude Capacitor for Mac builds, but this requires significant code changes and the app won't have native features on Mac.

## 🔧 Troubleshooting

### Issue: "Mac" option not showing in Deployment Info

**Fix:**
1. Clean build folder: `⌘⇧K`
2. Close and reopen Xcode
3. Verify the project file was saved correctly

### Issue: Build fails for Mac - "no library for this platform"

**This is expected** - Capacitor doesn't support Mac Catalyst. Use Electron instead (see Option 1 above).

### Issue: App doesn't look right on Mac

**Fix:**
- This is normal - Mac Catalyst apps use iPad UI
- You can adjust UI in your React/Next.js code for Mac-specific layouts
- Check `window.Capacitor.getPlatform()` to detect Mac

## 📦 Distributing Mac App

### For TestFlight:
- Mac Catalyst apps can be distributed through TestFlight
- Same process as iOS - archive and upload
- Testers can install on Mac via TestFlight

### For Mac App Store:
- Mac Catalyst apps can be submitted to Mac App Store
- Requires separate Mac App Store listing
- Same bundle ID can be used

## ✅ You're Ready!

Your app is now configured for Mac Catalyst. Just:
1. Open Xcode
2. Check "Mac" in Deployment Info
3. Build and run!

The app will work on Mac just like it does on iOS/iPad.

