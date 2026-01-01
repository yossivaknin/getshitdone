# Capacitor Setup Guide for SITREP

This guide will help you set up Capacitor to build desktop and mobile apps from your Next.js application.

## Prerequisites

⚠️ **Important**: Capacitor 8 requires Node.js >= 22.0.0. Please upgrade your Node.js version before proceeding.

### Check Node.js Version
```bash
node --version
```

If you need to upgrade Node.js:
- **macOS**: Use Homebrew: `brew install node@22` or use [nvm](https://github.com/nvm-sh/nvm): `nvm install 22 && nvm use 22`
- **Windows**: Download from [nodejs.org](https://nodejs.org/)
- **Linux**: Use your package manager or nvm

## Installation

All Capacitor packages are already installed. If you need to reinstall:

```bash
npm install @capacitor/core @capacitor/cli @capacitor/app @capacitor/haptics @capacitor/keyboard @capacitor/status-bar @capacitor/splash-screen
npm install --save-dev @capacitor/ios @capacitor/android
```

## Initial Setup

### 1. Initialize Capacitor (requires Node.js >= 22)

```bash
npx cap init
```

This will prompt you for:
- **App name**: SITREP
- **App ID**: com.sitrep.app (or your preferred bundle ID)
- **Web directory**: out (for static export) or .next (for server mode)

### 2. Add Platforms

#### iOS (macOS only)
```bash
npx cap add ios
```

#### Android
```bash
npx cap add android
```

## Configuration

### Capacitor Config

The `capacitor.config.ts` file is already created with basic configuration. You can customize:

- **appId**: Your app bundle identifier
- **appName**: Display name of your app
- **webDir**: Directory where built files are located
- **server.url**: For development, point to your Next.js dev server

### Development Mode

For development, you can configure Capacitor to point to your Next.js dev server:

```typescript
// capacitor.config.ts
server: {
  url: 'http://localhost:3000',
  cleartext: true, // Allow HTTP (for localhost)
}
```

### Production Mode

For production builds, you have two options:

#### Option 1: Static Export (Limited - No Server Actions)
If you can convert your app to work without server actions:

1. Update `next.config.mjs`:
```javascript
output: 'export',
```

2. Build:
```bash
npm run build
```

3. Sync to Capacitor:
```bash
npx cap sync
```

#### Option 2: Deployed Server (Recommended)
Point Capacitor to your deployed Next.js app:

```typescript
// capacitor.config.ts
server: {
  url: 'https://your-production-url.com',
}
```

## Building for Mobile/Desktop

### Build Process

1. **Build your Next.js app**:
```bash
npm run build
```

2. **Sync with Capacitor** (copies web assets to native projects):
```bash
npm run cap:sync
```

3. **Open native IDE**:
```bash
# iOS (macOS only)
npm run cap:open:ios

# Android
npm run cap:open:android
```

### Available Scripts

- `npm run cap:sync` - Sync web assets to native projects
- `npm run cap:copy` - Copy web assets only
- `npm run cap:update` - Update Capacitor dependencies
- `npm run cap:open:ios` - Open iOS project in Xcode
- `npm run cap:open:android` - Open Android project in Android Studio

## Platform-Specific Setup

### iOS Setup

1. **Requirements**:
   - macOS
   - Xcode (from App Store)
   - CocoaPods: `sudo gem install cocoapods`

2. **Install dependencies**:
```bash
cd ios/App
pod install
cd ../..
```

3. **Open in Xcode**:
```bash
npm run cap:open:ios
```

4. **Configure**:
   - Set your Team in Signing & Capabilities
   - Configure Bundle Identifier
   - Set minimum iOS version (recommended: 13.0+)

5. **Build & Run**:
   - Select a simulator or device
   - Click Run (⌘R)

### Android Setup

1. **Requirements**:
   - Android Studio
   - Java Development Kit (JDK) 17 or higher
   - Android SDK

2. **Open in Android Studio**:
```bash
npm run cap:open:android
```

3. **Configure**:
   - Set minimum SDK version (recommended: 22+)
   - Configure package name
   - Set up signing for release builds

4. **Build & Run**:
   - Select an emulator or device
   - Click Run (▶️)

## Desktop App (Electron)

For desktop apps, you can use Capacitor with Electron or use Tauri (lighter alternative).

### Using Capacitor with Electron

1. Install Electron:
```bash
npm install --save-dev @capacitor-community/electron
```

2. Add Electron platform:
```bash
npx cap add @capacitor-community/electron
```

3. Build:
```bash
npm run build
npx cap sync @capacitor-community/electron
npx cap open @capacitor-community/electron
```

### Using Tauri (Alternative - Recommended for Desktop)

Tauri is a lighter alternative to Electron:

1. Install Tauri CLI:
```bash
npm install --save-dev @tauri-apps/cli
```

2. Initialize Tauri:
```bash
npm run tauri init
```

3. Build:
```bash
npm run tauri build
```

## Important Notes

### Server Actions & API Routes

Your app uses Next.js Server Actions and API routes. These won't work with static export. Options:

1. **Use deployed server**: Point Capacitor to your production URL
2. **Convert to client-side**: Move API logic to client components
3. **Use Capacitor HTTP plugin**: Make API calls to your deployed backend

### Environment Variables

Make sure to configure environment variables for your native apps:
- Create `.env.local` for development
- For production, set environment variables in your build process
- For native apps, you may need to use Capacitor's Preferences plugin

### OAuth & Deep Links

For Google OAuth to work in native apps:
1. Configure OAuth redirect URIs for your app scheme (e.g., `sitrep://oauth/callback`)
2. Use Capacitor's App plugin to handle deep links
3. Update your OAuth configuration in Google Cloud Console

## Troubleshooting

### Node.js Version Issues
If you see Node.js version errors, upgrade to Node.js 22+:
```bash
# Using nvm
nvm install 22
nvm use 22
```

### Build Errors
- Make sure you've run `npm run build` before syncing
- Clear `.next` folder and rebuild if needed
- Check that `webDir` in `capacitor.config.ts` matches your build output

### iOS Build Issues
- Run `pod install` in `ios/App` directory
- Clean build folder in Xcode (⌘⇧K)
- Check signing & capabilities

### Android Build Issues
- Clean project in Android Studio
- Invalidate caches: File → Invalidate Caches
- Check Gradle sync status

## Next Steps

1. Upgrade Node.js to version 22+
2. Run `npx cap init` to finalize configuration
3. Add platforms: `npx cap add ios` and/or `npx cap add android`
4. Build and test on simulators/emulators
5. Configure app icons and splash screens
6. Set up app signing for release builds
7. Test OAuth and deep linking
8. Build release versions for app stores

## Resources

- [Capacitor Documentation](https://capacitorjs.com/docs)
- [Next.js Static Export](https://nextjs.org/docs/app/building-your-application/deploying/static-exports)
- [Capacitor iOS Guide](https://capacitorjs.com/docs/ios)
- [Capacitor Android Guide](https://capacitorjs.com/docs/android)

