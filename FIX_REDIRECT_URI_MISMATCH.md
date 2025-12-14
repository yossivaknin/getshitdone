# Fix Google OAuth Redirect URI Mismatch Error

## Error Message
```
Error 400: redirect_uri_mismatch
You can't sign in because this app sent an invalid request.
```

## What This Means
The redirect URI your app is sending to Google doesn't match what's configured in Google Cloud Console.

## Current App Configuration
Your app is configured to use:
- **Redirect URI**: `https://usesitrep.com/api/auth/google/callback` (production)
- **Redirect URI**: `http://localhost:3000/api/auth/google/callback` (local dev)

## How to Fix

### Step 1: Check Your Current Domain
1. Open your app in the browser
2. Check the URL in the address bar (e.g., `https://usesitrep.com` or `http://localhost:3000`)
3. Note the exact domain

### Step 2: Update Google Cloud Console

1. **Go to Google Cloud Console:**
   - Visit: https://console.cloud.google.com/
   - Select your project

2. **Navigate to OAuth Credentials:**
   - Go to **APIs & Services** → **Credentials**
   - Find your OAuth 2.0 Client ID (the one you're using for Google Calendar)
   - Click on it to edit

3. **Add/Update Authorized Redirect URIs:**
   
   **For Production (usesitrep.com):**
   ```
   https://usesitrep.com/api/auth/google/callback
   ```
   
   **For Local Development:**
   ```
   http://localhost:3000/api/auth/google/callback
   ```
   
   **Important Notes:**
   - Must match EXACTLY (including `https` vs `http`)
   - No trailing slashes
   - Case-sensitive
   - Must include the full path: `/api/auth/google/callback`

4. **Also Add Authorized JavaScript Origins:**
   
   **For Production:**
   ```
   https://usesitrep.com
   ```
   
   **For Local Development:**
   ```
   http://localhost:3000
   ```

5. **Click "Save"**

### Step 3: Verify the Configuration

After saving, verify:
- ✅ The redirect URI in Google Cloud Console matches: `https://usesitrep.com/api/auth/google/callback`
- ✅ No typos or extra characters
- ✅ Using `https` (not `http`) for production
- ✅ No trailing slash

### Step 4: Test

1. Clear your browser cache/cookies (or use incognito mode)
2. Try connecting Google Calendar again in Settings
3. The error should be resolved

## Common Mistakes

❌ **Wrong:**
- `https://usesitrep.com/auth/callback` (missing `/api`)
- `https://usesitrep.com/api/auth/google/callback/` (trailing slash)
- `http://usesitrep.com/api/auth/google/callback` (using http instead of https)

✅ **Correct:**
- `https://usesitrep.com/api/auth/google/callback`

## If You're Using a Different Domain

If your app is deployed to a different domain (not `usesitrep.com`):

1. Replace `usesitrep.com` with your actual domain in the redirect URI
2. Make sure to add BOTH:
   - Production domain: `https://yourdomain.com/api/auth/google/callback`
   - Local dev: `http://localhost:3000/api/auth/google/callback`

## Still Having Issues?

1. **Check the exact error in browser console:**
   - Open browser DevTools (F12)
   - Go to Console tab
   - Look for the exact redirect URI being sent

2. **Verify in Google Cloud Console:**
   - Make sure you're editing the correct OAuth Client ID
   - Check that changes were saved (refresh the page)

3. **Wait a few minutes:**
   - Google sometimes takes a few minutes to propagate changes

4. **Check for multiple OAuth clients:**
   - Make sure you're using the same Client ID that has the redirect URI configured
   - Check your `.env` file matches the Client ID in Google Cloud Console




