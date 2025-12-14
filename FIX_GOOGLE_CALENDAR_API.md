# Fix: Google Calendar API Not Working

## 🚨 The Error

```
Failed to fetch busy slots from calendar. Cannot schedule without conflict detection. 
Please check your Google Calendar connection and try again.
```

This means the Google Calendar API is failing when trying to fetch your busy slots.

---

## ✅ Quick Fixes

### Step 1: Reconnect Google Calendar

The most common cause is an expired or invalid access token.

1. Go to **Settings** in your app
2. Click **"Disconnect"** (if connected)
3. Click **"Connect Google Calendar"** again
4. Authorize the app with Google
5. Try scheduling a task again

### Step 2: Check Token in Browser Console

1. Open browser DevTools (F12)
2. Go to **Console** tab
3. Type: `localStorage.getItem('google_calendar_token')`
4. Check if you see a token (long string starting with `ya29.` or similar)
5. If you see `null`, the token is missing - reconnect in Settings

### Step 3: Verify Google Calendar Permissions

1. Go to [Google Account Settings](https://myaccount.google.com/permissions)
2. Find "SitRep" or your app in the list
3. Make sure it has **Calendar** permissions
4. If not, reconnect in Settings

---

## 🔍 Common Causes

### 1. **Expired Access Token**
- **Symptom**: Error mentions "401" or "unauthorized"
- **Fix**: Reconnect Google Calendar in Settings
- **Prevention**: The app now automatically refreshes tokens when possible

### 2. **Missing Refresh Token**
- **Symptom**: Token expires and can't be refreshed
- **Fix**: Reconnect Google Calendar (make sure to grant "offline access")
- **Note**: The OAuth flow should request `access_type=offline` and `prompt=consent`

### 3. **Revoked Permissions**
- **Symptom**: Error mentions "403" or "permission denied"
- **Fix**: Go to Google Account Settings → Third-party apps → Remove app → Reconnect

### 4. **Invalid Client ID/Secret**
- **Symptom**: OAuth fails completely
- **Fix**: Check environment variables in Vercel:
  - `NEXT_PUBLIC_GOOGLE_CLIENT_ID`
  - `GOOGLE_CLIENT_SECRET`
- **Note**: Make sure these match your Google Cloud Console credentials

---

## 🛠️ What Was Fixed

The code has been improved to:

1. **Better Error Messages**: Now shows specific error details (401, 403, etc.)
2. **Automatic Token Refresh**: Attempts to refresh expired tokens automatically
3. **Graceful Handling**: Better handling of empty calendars (no busy slots is OK)
4. **Detailed Logging**: More console logs to help diagnose issues

---

## 🧪 Test the Connection

After reconnecting, try:

1. **Create a task** with a duration
2. **Click "Book The Time"**
3. **Check browser console** for detailed logs:
   - Look for `[SCHEDULE]` and `[CALENDAR]` logs
   - Check for any error messages

---

## 📋 Debug Checklist

- [ ] Token exists in localStorage (`google_calendar_token`)
- [ ] Refresh token exists (`google_calendar_refresh_token`)
- [ ] Google Calendar permissions granted
- [ ] Environment variables set in Vercel
- [ ] OAuth redirect URI matches in Google Cloud Console
- [ ] No errors in browser console when scheduling

---

## ✅ Still Not Working?

If reconnecting doesn't work:

1. **Check browser console** for specific error messages
2. **Check Vercel logs** for server-side errors
3. **Verify environment variables** are set correctly
4. **Test OAuth flow** - try disconnecting and reconnecting

The improved error messages should now tell you exactly what's wrong!



