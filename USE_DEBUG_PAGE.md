# How to Test Google Calendar API Using Debug Page

## ✅ Why Use the Debug Page?

The debug page runs **server-side** through Next.js API routes, which:
- ✅ **Bypasses CORS** (no browser console errors)
- ✅ Shows the **actual API response** from Google
- ✅ Reveals **404 HTML errors** that indicate API issues
- ✅ Provides **detailed error messages** with troubleshooting steps

## 🚀 Quick Start

### Step 1: Open the Debug Page

**Local:**
```
http://localhost:3000/debug-slots
```

**Production:**
```
https://usesitrep.com/debug-slots
```

### Step 2: Get Your Token

1. **Open browser console** (F12 or Cmd+Option+I)
2. **Run this command:**
   ```javascript
   localStorage.getItem('google_calendar_token')
   ```
3. **Copy the token** (it will look like `ya29.a0Aa7pCA98YgzfL...`)

### Step 3: Paste Token on Debug Page

1. **Check the box**: "Use manual token (paste from browser console)"
2. **Paste your token** into the "Google Calendar Access Token" field
3. **Select a date** (e.g., today or tomorrow)
4. **Click**: "Check Available Slots"

### Step 4: Review Results

The page will show:
- ✅ **Busy Slots**: All meetings/events found
- ✅ **Free Slots**: Available time slots (30min and 60min)
- ❌ **Errors**: Detailed error messages if something fails

## 🔍 What to Look For

### ✅ Success Indicators

If you see:
- **Busy Slots** with meetings listed
- **Free Slots** showing available times
- No error messages

→ **API is working correctly!**

### ❌ Error Indicators

If you see:
- **"Google Calendar API returned 404 HTML page"**
- **"Failed to fetch busy slots"**
- **Empty busy slots** (0 total)

→ **API is not working** - see troubleshooting below

## 🐛 Troubleshooting

### Error: "404 HTML page"

This means the Calendar API is returning an HTML error page instead of JSON. This usually indicates:

1. **API Not Enabled**
   - Go to: https://console.cloud.google.com/apis/library/calendar-json.googleapis.com
   - Click "Enable"

2. **API in Different Project**
   - Check your OAuth Client ID matches the project with Calendar API enabled
   - Go to: https://console.cloud.google.com/apis/credentials
   - Verify Client ID matches your `.env.local` file

3. **Billing Not Enabled**
   - Even free tier needs billing enabled
   - Go to: https://console.cloud.google.com/billing

4. **OAuth Consent Screen Issues**
   - If you switched to "Production" mode, consent screen may need re-verification
   - Go to: https://console.cloud.google.com/apis/credentials/consent

### Error: "Token does not have calendar scope"

1. **Reconnect Google Calendar** in Settings
2. **Grant calendar permissions** when prompted
3. **Get a new token** and try again

### Error: "No busy slots found" (but no error)

This means the API is working, but:
- You have no meetings scheduled
- OR the FreeBusy API isn't returning data (rare)

**Test**: Try scheduling a test meeting in Google Calendar, then check again.

## 📋 Example Console Output

When you click "Check Available Slots", check your **browser console** and **server logs** for:

```
[DEBUG] Fetching busy slots for 2024-12-06...
[CALENDAR] Token info: { expires_in: 3598, scope: 'https://www.googleapis.com/auth/calendar', ... }
[CALENDAR] Response status: 200 OK
[DEBUG] Success! { busySlots: { total: 5, ... }, freeSlots: { ... } }
```

Or if there's an error:

```
[CALENDAR] ❌ Got HTML 404 response
[CALENDAR] Full error response: <!DOCTYPE html>...
[DEBUG] API Error: { error: 'Google Calendar API returned 404 HTML page...', ... }
```

## 🎯 Next Steps After Testing

1. **If API works**: The issue is likely in the app code, not the API
2. **If API fails**: Follow the troubleshooting steps above
3. **If you see specific errors**: Share them and we can fix them

## 💡 Pro Tip

You can also check the **Network tab** in browser DevTools:
1. Open DevTools → Network tab
2. Click "Check Available Slots"
3. Look for the `/api/debug-slots` request
4. Check the **Response** tab to see the full API response

This will show you exactly what Google Calendar API is returning!



