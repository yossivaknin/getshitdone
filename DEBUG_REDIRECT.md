# Debugging OAuth Redirect Issue

## Current Setup

- **URL Scheme**: `com.sitrep.app://oauth/callback`
- **Bundle ID**: `com.yossivaknin.sitrep` (different, but that's OK)
- **Info.plist**: URL scheme is registered

## Testing the Redirect

### Step 1: Test URL Scheme Manually

1. Open Safari on your Mac (or simulator)
2. Type in the address bar: `com.sitrep.app://oauth/callback?connected=true&token=test123`
3. Press Enter
4. **Expected**: The app should open (if running) or iOS should ask to open the app

If this doesn't work, the URL scheme isn't properly registered.

### Step 2: Check Info.plist

Verify the URL scheme is in `ios/App/App/Info.plist`:

```xml
<key>CFBundleURLTypes</key>
<array>
    <dict>
        <key>CFBundleTypeRole</key>
        <string>Editor</string>
        <key>CFBundleURLName</key>
        <string>com.sitrep.app</string>
        <key>CFBundleURLSchemes</key>
        <array>
            <string>com.sitrep.app</string>
        </array>
    </dict>
</array>
```

### Step 3: Check Xcode

1. Open Xcode: `npm run cap:open:ios`
2. Select project → App target → Info tab
3. Verify "URL Types" shows `com.sitrep.app`
4. If missing, add it:
   - Click "+" under URL Types
   - Identifier: `com.sitrep.app`
   - URL Schemes: `com.sitrep.app`
   - Role: `Editor`

### Step 4: Rebuild

After making changes:
1. Clean Build Folder: ⌘⇧K
2. Build and Run: ⌘R

### Step 5: Check Console Logs

When testing OAuth:
1. Open Xcode console
2. Look for: `[OAuth Callback] App URL: com.sitrep.app://oauth/callback?...`
3. Look for: `[Capacitor] App opened with URL: ...`
4. If you don't see the second log, the redirect isn't working

## Common Issues

1. **URL scheme not registered**: Re-add in Xcode Info tab
2. **App not running**: The redirect only works if app is installed/running
3. **Safari blocking**: Safari might block the redirect - user needs to tap the button
4. **URL encoding**: Tokens might have special characters that need encoding

## Alternative: Use Universal Links

If custom URL schemes don't work, consider Universal Links (more complex but more reliable):
- Requires an `apple-app-site-association` file on your domain
- More setup but better UX


