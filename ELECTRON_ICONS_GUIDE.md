# Electron Icons Guide - How to Change the Logo

## Current Configuration

Your Electron app is configured to use icons from the `build/` directory:
- **macOS**: `build/icon.icns` (required)
- **Windows**: `build/icon.ico` (optional)
- **DMG Background**: `build/background.png` (optional)

## Quick Setup (Easiest Method)

### Step 1: Prepare Your Icon Image

You need a **square PNG image** (recommended: 1024x1024px or 512x512px)
- Transparent background (PNG with alpha channel)
- High resolution for best quality
- Square aspect ratio (1:1)

### Step 2: Generate Icons Automatically

**Use the provided script** (easiest method):

```bash
npm run electron:icons <path-to-your-logo.png>
```

**Example:**
```bash
# If your logo is in the project root
npm run electron:icons logo.png

# Or with full path
npm run electron:icons /path/to/your/logo.png
```

This will automatically:
- ✅ Generate `build/icon.icns` (macOS)
- ✅ Generate `build/icon.ico` (Windows, if ImageMagick is installed)

**That's it!** Then rebuild: `npm run electron:build`

---

## Manual Setup (Alternative)

If you prefer to do it manually, you have **two options**:

#### Option A: Use Online Tools (Easiest)

1. **For macOS (.icns):**
   - Go to: https://cloudconvert.com/png-to-icns
   - Upload your PNG
   - Download the `.icns` file
   - Save as: `build/icon.icns`

2. **For Windows (.ico):**
   - Go to: https://cloudconvert.com/png-to-ico
   - Upload your PNG
   - Download the `.ico` file
   - Save as: `build/icon.ico`

#### Option B: Use Command Line Tools (More Control)

**For macOS (.icns):**

1. Install `iconutil` (comes with macOS):
   ```bash
   # Create a temporary iconset directory
   mkdir -p build/icon.iconset
   
   # Create different sizes (required for .icns)
   sips -z 16 16     your-icon.png --out build/icon.iconset/icon_16x16.png
   sips -z 32 32     your-icon.png --out build/icon.iconset/icon_16x16@2x.png
   sips -z 32 32     your-icon.png --out build/icon.iconset/icon_32x32.png
   sips -z 64 64     your-icon.png --out build/icon.iconset/icon_32x32@2x.png
   sips -z 128 128   your-icon.png --out build/icon.iconset/icon_128x128.png
   sips -z 256 256   your-icon.png --out build/icon.iconset/icon_128x128@2x.png
   sips -z 256 256   your-icon.png --out build/icon.iconset/icon_256x256.png
   sips -z 512 512   your-icon.png --out build/icon.iconset/icon_256x256@2x.png
   sips -z 512 512   your-icon.png --out build/icon.iconset/icon_512x512.png
   sips -z 1024 1024 your-icon.png --out build/icon.iconset/icon_512x512@2x.png
   
   # Convert to .icns
   iconutil -c icns build/icon.iconset -o build/icon.icns
   
   # Clean up
   rm -rf build/icon.iconset
   ```

**For Windows (.ico):**

Install ImageMagick:
```bash
brew install imagemagick  # macOS
```

Then convert:
```bash
convert your-icon.png -define icon:auto-resize=256,128,64,48,32,16 build/icon.ico
```

### Step 3: Place Files in Build Directory

```
build/
├── icon.icns      # macOS icon (required)
├── icon.ico      # Windows icon (optional)
└── background.png # DMG background (optional)
```

### Step 4: Rebuild the App

```bash
npm run electron:build
```

The new icon will be used in the built app!

## Alternative: Use a Single PNG (Simpler)

If you want to use a single PNG file instead, you can update `electron-builder.yml`:

```yaml
mac:
  icon: build/icon.png  # Change from .icns to .png
```

However, `.icns` is recommended for macOS as it provides better quality and multiple sizes.

## DMG Background (Optional)

You can also customize the DMG installer background:

1. Create a background image: `build/background.png`
   - Recommended size: 658x498px (or 1280x720px)
   - This appears behind the app icon in the DMG window

2. The background is already configured in `electron-builder.yml`

## Using Your Existing Logo

If you have a logo file already:

1. **Find your logo:**
   - Check `public/` folder
   - Check `src/components/logo.tsx` for logo references
   - Or use any square PNG image

2. **Convert it:**
   - Use one of the methods above
   - Place in `build/` directory

3. **Rebuild:**
   ```bash
   npm run electron:build
   ```

## Using the Icon Generator Script

A script is already set up! Just run:

```bash
npm run electron:icons <path-to-png>
```

**Requirements:**
- macOS: Uses built-in `sips` and `iconutil` (no installation needed)
- Windows .ico: Requires ImageMagick (`brew install imagemagick`)

**What it does:**
1. Takes your PNG file
2. Generates all required icon sizes
3. Creates `build/icon.icns` for macOS
4. Creates `build/icon.ico` for Windows (if ImageMagick is installed)

## Testing the Icon

1. **Build the app:**
   ```bash
   npm run electron:build
   ```

2. **Check the DMG:**
   - Open `dist/SITREP-0.1.1.dmg`
   - The icon should appear in the DMG window
   - When installed, the app icon should appear in Applications

3. **Check the app:**
   - Open the app from Applications
   - The icon should appear in the Dock
   - The icon should appear in the app switcher (⌘Tab)

## Troubleshooting

### Icon doesn't appear

1. **Check file exists:**
   ```bash
   ls -la build/icon.icns
   ```

2. **Check file format:**
   - Make sure it's a valid `.icns` file
   - Try regenerating it

3. **Clean and rebuild:**
   ```bash
   rm -rf dist/
   npm run electron:build
   ```

### Icon looks blurry

- Use higher resolution source image (1024x1024px or larger)
- Make sure you're generating all required sizes in the .icns file

### Icon doesn't update

- Delete `dist/` folder
- Rebuild: `npm run electron:build`
- Sometimes macOS caches icons - restart your Mac if needed

## Summary

1. **Get a square PNG** (1024x1024px recommended)
2. **Convert to .icns** (use online tool or command line)
3. **Place in `build/icon.icns`**
4. **Rebuild:** `npm run electron:build`

That's it! Your app will have a custom icon.

