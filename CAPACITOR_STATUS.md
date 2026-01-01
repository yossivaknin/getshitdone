# Capacitor Setup Status

## ✅ What's Already Done (Completed by AI)

### 1. Package Installation ✅
- ✅ All Capacitor core packages installed (`@capacitor/core`, `@capacitor/cli`)
- ✅ All Capacitor plugins installed (`@capacitor/app`, `@capacitor/haptics`, `@capacitor/keyboard`, `@capacitor/status-bar`, `@capacitor/splash-screen`)
- ✅ Platform packages installed (`@capacitor/ios`, `@capacitor/android`)

### 2. Configuration Files ✅
- ✅ `capacitor.config.ts` created with:
  - App ID: `com.sitrep.app`
  - App Name: `SITREP`
  - Web directory: `out`
  - Splash screen configuration
  - Status bar configuration
- ✅ `next.config.mjs` updated with Capacitor build support
- ✅ `.gitignore` updated to exclude `ios/`, `android/`, and `.capacitor/` folders

### 3. Scripts & Automation ✅
- ✅ Added npm scripts to `package.json`:
  - `cap:sync` - Sync web assets to native projects
  - `cap:copy` - Copy web assets only
  - `cap:update` - Update Capacitor dependencies
  - `cap:open:ios` - Open iOS project in Xcode
  - `cap:open:android` - Open Android project in Android Studio
  - `cap:add:ios` - Add iOS platform
  - `cap:add:android` - Add Android platform
  - `build:capacitor` - Build for Capacitor

### 4. Code Integration ✅
- ✅ `src/components/capacitor-init.tsx` created - Handles Capacitor initialization
- ✅ `src/app/layout.tsx` updated - CapacitorInit component integrated
- ✅ Setup guide created: `CAPACITOR_SETUP.md`
- ✅ Setup script created: `scripts/setup-capacitor.sh`

---

## ❌ What You Need to Do

### Prerequisites (REQUIRED FIRST)

#### 1. Upgrade Node.js ⚠️ **CRITICAL**
**Status**: ❌ Not done - **YOU MUST DO THIS FIRST**

Your current Node.js version: `18.16.0`  
Required version: `>= 22.0.0`

**Steps:**
```bash
# Check current version
node --version

# Upgrade using nvm (recommended)
nvm install 22
nvm use 22

# Or using Homebrew (macOS)
brew install node@22

# Verify upgrade
node --version  # Should show v22.x.x or higher
```

**Why this is critical**: Capacitor 8 CLI requires Node.js 22+. Without this, you cannot run any Capacitor commands.

---

### Initial Setup (After Node.js Upgrade)

#### 2. Initialize Capacitor
**Status**: ❌ Not done - **REQUIRES NODE 22+**

```bash
npx cap init
```

**What it does**: Creates the native project structure
**Prompts you for**:
- App name: `SITREP` (already in config, but will be confirmed)
- App ID: `com.sitrep.app` (already in config, but will be confirmed)
- Web directory: `out` (for static export) or `.next` (for server mode)

**Note**: The `capacitor.config.ts` file already exists, so this will use those values.

---

#### 3. Add Platforms
**Status**: ❌ Not done - **REQUIRES NODE 22+**

**iOS (macOS only):**
```bash
npx cap add ios
# or
npm run cap:add:ios
```

**Android:**
```bash
npx cap add android
# or
npm run cap:add:android
```

**What it does**: Creates `ios/` and `android/` folders with native project files

---

### Platform-Specific Setup

#### 4. iOS Setup (macOS only)
**Status**: ❌ Not done

**Requirements:**
- macOS
- Xcode installed (from App Store)
- CocoaPods installed: `sudo gem install cocoapods`

**Steps:**
```bash
# Install iOS dependencies
cd ios/App
pod install
cd ../..

# Open in Xcode
npm run cap:open:ios
```

**In Xcode, you'll need to:**
- Set your Apple Developer Team in Signing & Capabilities
- Configure Bundle Identifier (should be `com.sitrep.app`)
- Set minimum iOS version (recommended: 13.0+)
- Build and run on simulator or device

---

#### 5. Android Setup
**Status**: ❌ Not done

**Requirements:**
- Android Studio installed
- Java Development Kit (JDK) 17 or higher
- Android SDK configured

**Steps:**
```bash
# Open in Android Studio
npm run cap:open:android
```

**In Android Studio, you'll need to:**
- Set minimum SDK version (recommended: 22+)
- Configure package name (should be `com.sitrep.app`)
- Set up signing for release builds
- Build and run on emulator or device

---

### Building & Testing

#### 6. Build Your App
**Status**: ❌ Not done

**Option A: Static Export (Limited - No Server Actions)**
```bash
# Update next.config.mjs to add: output: 'export'
npm run build
npm run cap:sync
```

**Option B: Point to Deployed Server (Recommended)**
```bash
# Build normally
npm run build

# Update capacitor.config.ts to point to your production URL:
# server: { url: 'https://your-production-url.com' }

# Sync
npm run cap:sync
```

**Why Option B is recommended**: Your app uses Next.js Server Actions and API routes, which won't work with static export.

---

#### 7. Sync & Test
**Status**: ❌ Not done

```bash
# After building, sync web assets to native projects
npm run cap:sync

# Open in native IDEs
npm run cap:open:ios      # macOS only
npm run cap:open:android
```

---

### Configuration Tasks

#### 8. OAuth & Deep Links
**Status**: ❌ Not done

**What you need to do:**
1. Configure OAuth redirect URIs in Google Cloud Console:
   - iOS: `sitrep://oauth/callback`
   - Android: `sitrep://oauth/callback`
2. Update your OAuth callback handler to support deep links
3. Test OAuth flow in native apps

---

#### 9. App Icons & Splash Screens
**Status**: ❌ Not done

**What you need to do:**
1. Create app icons for iOS and Android
2. Create splash screen images
3. Add them to the native projects:
   - iOS: `ios/App/App/Assets.xcassets/AppIcon.appiconset/`
   - Android: `android/app/src/main/res/`

---

#### 10. Environment Variables
**Status**: ❌ Not done

**What you need to do:**
1. Configure environment variables for native builds
2. For production, ensure API keys and secrets are properly configured
3. Consider using Capacitor's Preferences plugin for sensitive data

---

## Quick Start Checklist

Once Node.js is upgraded to 22+:

- [ ] Run `npx cap init` (or use `./scripts/setup-capacitor.sh`)
- [ ] Run `npm run cap:add:ios` (macOS only)
- [ ] Run `npm run cap:add:android`
- [ ] Install iOS dependencies: `cd ios/App && pod install`
- [ ] Build your app: `npm run build`
- [ ] Sync to Capacitor: `npm run cap:sync`
- [ ] Open in Xcode: `npm run cap:open:ios`
- [ ] Open in Android Studio: `npm run cap:open:android`
- [ ] Configure app signing and bundle IDs
- [ ] Test on simulators/emulators
- [ ] Configure OAuth deep links
- [ ] Add app icons and splash screens
- [ ] Build release versions

---

## Summary

**Completed (AI)**: ~40% - All packages, configs, scripts, and code integration  
**Remaining (You)**: ~60% - Node.js upgrade, platform setup, building, testing, and configuration

**Blocking Issue**: Node.js version must be upgraded to 22+ before any Capacitor commands will work.

