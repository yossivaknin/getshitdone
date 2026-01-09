# Testing the URL Scheme

## Quick Test

To verify the URL scheme is working:

1. **Make sure the app is built and installed** (running in simulator or device)

2. **Open Safari** (on Mac or in simulator)

3. **Type this in the address bar:**
   ```
   com.sitrep.app://oauth/callback?connected=true&token=test123
   ```

4. **Press Enter**

5. **Expected Result:**
   - If app is running: App should come to foreground
   - If app is not running: iOS should ask to open the app
   - If nothing happens: URL scheme is not registered properly

## If URL Scheme Doesn't Work

### Option 1: Re-register in Xcode

1. Open Xcode: `npm run cap:open:ios`
2. Select project (top item) → App target
3. Go to **Info** tab
4. Scroll to **URL Types**
5. If you see `com.sitrep.app`, delete it and re-add:
   - Click **"-"** to remove
   - Click **"+"** to add new
   - **Identifier**: `com.sitrep.app`
   - **URL Schemes**: Click **"+"** and enter `com.sitrep.app`
   - **Role**: `Editor`
6. Save (⌘S)
7. Clean Build: ⌘⇧K
8. Build and Run: ⌘R

### Option 2: Verify Info.plist

Check that `ios/App/App/Info.plist` has:

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

### Option 3: Sync Capacitor

After making changes:

```bash
npm run cap:sync
```

Then rebuild in Xcode.

## Current Configuration

- **URL Scheme**: `com.sitrep.app://oauth/callback`
- **Bundle ID**: `com.yossivaknin.sitrep` (different, but OK)
- **Status**: Registered in Info.plist

## Debugging OAuth Redirect

When testing OAuth:

1. Check Xcode console for:
   - `[OAuth Callback] App URL: com.sitrep.app://oauth/callback?...`
   - `[Capacitor] App opened with URL: com.sitrep.app://oauth/callback?...`

2. If you see the first but not the second:
   - URL scheme isn't working
   - Re-register in Xcode

3. If you see neither:
   - Check that the redirect page is loading
   - Check browser console for errors


