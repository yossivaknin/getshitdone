# Fixing CSS Loading in Capacitor

## Issue
The Capacitor app has no CSS styling - the page appears unstyled.

## Root Cause
When using `server.url` in Capacitor config, the app loads everything from the dev server. If the server isn't accessible or CSS paths are wrong, styles won't load.

## Solution

### Step 1: Verify Dev Server is Running
```bash
cd get-shit-done
npm run dev
```

Make sure it's running on port 3000 and accessible.

### Step 2: Update Capacitor Config
The config should use your local IP address (not localhost) so the simulator can connect:

```typescript
server: {
  url: 'http://192.168.1.70:3000',  // Your local IP
  cleartext: true
}
```

### Step 3: Sync Capacitor
```bash
npm run cap:sync
```

### Step 4: Rebuild in Xcode
1. Open Xcode: `npm run cap:open:ios`
2. Clean Build Folder: ⌘⇧K
3. Build and Run: ⌘R

### Step 5: Check Network Connection
In Xcode console, look for:
- `⚡️ Loading app at http://192.168.1.70:3000...`
- Any network errors
- CSS file loading errors

## Alternative: Use Static Export (if server actions aren't critical)

If you don't need server actions in the mobile app, you can use static export:

1. Update `next.config.mjs`:
```javascript
output: process.env.CAPACITOR_BUILD === 'true' ? 'export' : undefined,
```

2. Update `capacitor.config.ts`:
```typescript
webDir: 'out',
// Remove or comment out server.url
```

3. Build:
```bash
CAPACITOR_BUILD=true npm run build
npm run cap:sync
```

## Troubleshooting

### If CSS still doesn't load:

1. **Check browser console in Xcode:**
   - Window → Devices and Simulators
   - Select your device/simulator
   - Click "Open Console"
   - Look for CSS loading errors

2. **Verify dev server accessibility:**
   - From your Mac, open: `http://192.168.1.70:3000`
   - Should load the web version correctly
   - If not, check firewall settings

3. **Check Next.js dev server logs:**
   - Look for requests from the simulator
   - Verify CSS files are being served

4. **Try different IP:**
   - Find your IP: `ipconfig getifaddr en0` (Mac)
   - Update `capacitor.config.ts` with the correct IP
   - Sync and rebuild

5. **Clear Capacitor cache:**
   ```bash
   rm -rf ios/App/Pods
   rm -rf ios/App/build
   npm run cap:sync
   ```

## Current Configuration

- **webDir**: `.next` (build output)
- **server.url**: `http://192.168.1.70:3000` (dev server)
- **cleartext**: `true` (allows HTTP)

This configuration loads the app from the dev server, which is necessary for server actions to work.


