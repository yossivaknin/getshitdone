# How to Install and Open SITREP App

## ✅ Your App is Built!

The app has been built and is ready to install. You'll find it in the `dist/` folder.

## 📦 Installation Steps

### Step 1: Find the DMG File

The build created a DMG (disk image) file:
- **Location**: `dist/SITREP-0.1.1.dmg` (or `dist/SITREP-0.1.1-arm64.dmg` for Apple Silicon)
- **Size**: ~200-250MB

### Step 2: Open the DMG

1. **Double-click** the DMG file in Finder
   - Or right-click → "Open"
   - The DMG will mount and show a window

2. **In the DMG window**, you'll see:
   - SITREP.app icon
   - Applications folder (with arrow)

### Step 3: Install the App

**Drag and drop** the SITREP.app icon onto the Applications folder:
- Drag `SITREP.app` → Drop on `Applications` folder
- This copies the app to your Applications folder

### Step 4: Open the App

**Option 1: From Applications**
1. Open **Finder**
2. Go to **Applications** (⌘⇧A or click Applications in sidebar)
3. Find **SITREP** app
4. **Double-click** to open

**Option 2: From Launchpad**
1. Press **F4** or swipe with 4 fingers on trackpad
2. Find **SITREP** icon
3. Click to open

**Option 3: From Spotlight**
1. Press **⌘Space** (Command + Space)
2. Type "SITREP"
3. Press **Enter**

**Option 4: From Dock (after first launch)**
- After opening once, the app will appear in Dock
- Click the Dock icon to open

## 🔒 First Time Opening (Security Warning)

When you first open the app, macOS may show a security warning:

**"SITREP cannot be opened because it is from an unidentified developer"**

### To Fix This:

1. **Right-click** (or Control+click) the SITREP.app
2. Select **"Open"** from the menu
3. Click **"Open"** in the security dialog
4. The app will now open normally

**Why this happens:** The app is signed with a development certificate, not an App Store certificate. This is normal for apps you build yourself.

## 🚀 Using the App

Once installed:
- **Open from Applications** - Works like any other Mac app
- **Add to Dock** - Right-click Dock icon → Options → Keep in Dock
- **App Switcher** - Press ⌘Tab to switch between apps
- **Quit** - Press ⌘Q or right-click Dock icon → Quit

## 🔄 Updating the App

When you rebuild the app with changes:

1. **Build new version:**
   ```bash
   npm run electron:build
   ```

2. **Install new DMG:**
   - Open the new DMG
   - Drag SITREP.app to Applications
   - Replace the old version when prompted

## 📁 File Locations

- **DMG file**: `dist/SITREP-0.1.1.dmg`
- **Installed app**: `/Applications/SITREP.app`
- **App data**: `~/Library/Application Support/SITREP/` (if app stores data)

## 🗑️ Uninstalling

To remove the app:

1. Open **Finder** → **Applications**
2. Find **SITREP.app**
3. **Drag to Trash** (or right-click → Move to Trash)
4. Empty Trash if desired

## 🎯 Quick Summary

1. **Build**: `npm run electron:build` ✅ (Already done!)
2. **Open DMG**: Double-click `dist/SITREP-0.1.1.dmg`
3. **Install**: Drag SITREP.app to Applications
4. **Open**: Double-click SITREP in Applications
5. **Done!** App is now installed and ready to use

## 💡 Pro Tip

After installing, you can:
- **Pin to Dock**: Right-click Dock icon → Options → Keep in Dock
- **Create Alias**: Drag app to Desktop for quick access
- **Add to Launchpad**: Automatically appears after installation

Your SITREP app is now a real macOS application! 🎉

