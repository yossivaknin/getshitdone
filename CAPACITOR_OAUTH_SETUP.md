# Capacitor OAuth Setup for Google Calendar

## Issue
When connecting to Google Calendar in the Capacitor app, you're getting `{"code":"UNIMPLEMENTED"}` error.

## Solution

The OAuth flow in Capacitor works differently than web. Here's what needs to be configured:

### Step 1: Configure URL Scheme in Xcode

1. Open the iOS project in Xcode:
   ```bash
   cd get-shit-done
   npm run cap:open:ios
   ```

2. Select the project in the navigator (top item, "App")

3. Select the "App" target

4. Go to the **"Info"** tab

5. Scroll down to **"URL Types"** section

6. Click the **"+"** button to add a new URL Type

7. Configure it:
   - **Identifier**: `com.sitrep.app`
   - **URL Schemes**: `com.sitrep.app` (click the "+" to add)
   - **Role**: `Editor`

8. Save (⌘S)

### Step 2: Add Redirect URI in Google Cloud Console

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Navigate to **APIs & Services** → **Credentials**
3. Find your OAuth 2.0 Client ID (the one you're using)
4. Click to edit it
5. Under **"Authorized redirect URIs"**, add:
   ```
   com.sitrep.app://oauth/callback
   ```
6. Click **"Save"**

### Step 3: How It Works

1. User clicks "Connect Google Calendar" in the app
2. App navigates to Google OAuth URL with `redirect_uri=com.sitrep.app://oauth/callback`
3. User authorizes in Google's OAuth page
4. Google redirects to `com.sitrep.app://oauth/callback?code=...`
5. iOS system recognizes the custom URL scheme and opens the app
6. The `appUrlOpen` listener in `capacitor-init.tsx` catches the URL
7. App extracts the code and redirects to `/api/auth/google/callback?code=...&capacitor=true`
8. The callback route exchanges the code for tokens
9. User is redirected back to settings with tokens saved

### Step 4: Test

1. Rebuild the app in Xcode (⌘R)
2. Try connecting to Google Calendar
3. You should be redirected to Google's OAuth page
4. After authorizing, you should be redirected back to the app
5. Check the console logs for OAuth flow messages

## Troubleshooting

### If OAuth still doesn't work:

1. **Check URL Scheme is registered:**
   - In Xcode, verify the URL scheme appears in Info.plist
   - You can also check `ios/App/App/Info.plist` directly

2. **Check Google Cloud Console:**
   - Verify `com.sitrep.app://oauth/callback` is in Authorized redirect URIs
   - Make sure there are no typos or extra spaces

3. **Check console logs:**
   - Look for `[OAuth]` prefixed messages
   - Look for `App opened with URL:` messages
   - Check for any error messages

4. **Test the URL scheme:**
   - In Safari on your Mac, try opening: `com.sitrep.app://oauth/callback?code=test`
   - This should open the app (if it's running in simulator/device)

## Alternative: Use In-App Browser

If the above doesn't work, we can use Capacitor's Browser plugin with proper configuration, but that requires:
- Installing and syncing the Browser plugin
- Configuring it properly in the native project

For now, the URL scheme approach should work once properly configured.


