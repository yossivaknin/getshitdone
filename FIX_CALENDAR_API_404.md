# Fix: Google Calendar API 404 Error

## 🚨 The Error

```
Google Calendar API error (404): <!DOCTYPE html>...
The requested URL /calendar/v3/freebusy was not found on this server.
```

This error means **the Google Calendar API is not enabled** in your Google Cloud project.

---

## ✅ Quick Fix (2 minutes)

### Step 1: Enable Google Calendar API

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select your project (the one with your OAuth credentials)
3. Go to **APIs & Services** → **Library**
4. Search for **"Google Calendar API"**
5. Click on **"Google Calendar API"**
6. Click **"Enable"** button
7. Wait for it to enable (usually takes 10-30 seconds)

**Direct Link:** https://console.cloud.google.com/apis/library/calendar-json.googleapis.com

### Step 2: Verify API is Enabled

1. Go to **APIs & Services** → **Enabled APIs**
2. Look for **"Google Calendar API"** in the list
3. It should show as **"Enabled"** with a green checkmark

### Step 3: Test Again

After enabling the API:
1. Go back to your app
2. Try scheduling a task again
3. The 404 error should be gone!

---

## 🔍 Why This Happens

The 404 HTML error occurs when:
- The Calendar API isn't enabled in your Google Cloud project
- The API endpoint doesn't exist because the service isn't available
- Google returns an HTML 404 page instead of a JSON error

**Note:** Even if you have OAuth credentials set up, you still need to **enable the API** separately!

---

## ✅ Verification Checklist

After enabling the API, verify:

- [ ] Calendar API shows as "Enabled" in Google Cloud Console
- [ ] OAuth credentials are configured (Client ID and Secret)
- [ ] OAuth consent screen is configured
- [ ] Redirect URI is set correctly
- [ ] Environment variables are set in Vercel

---

## 🆘 Still Getting 404?

If you still get 404 after enabling the API:

1. **Wait 1-2 minutes** - API enablement can take a moment to propagate
2. **Check the correct project** - Make sure you enabled it in the same project as your OAuth credentials
3. **Check API quotas** - Go to **APIs & Services** → **Quotas** to see if there are any restrictions
4. **Try reconnecting** - Disconnect and reconnect Google Calendar in Settings

---

## 📋 Complete Setup Checklist

To ensure everything works:

1. ✅ **Enable Calendar API** (this is what you're missing!)
2. ✅ **Create OAuth 2.0 credentials** (Client ID and Secret)
3. ✅ **Configure OAuth consent screen**
4. ✅ **Set redirect URI** in Google Cloud Console
5. ✅ **Set environment variables** in Vercel
6. ✅ **Connect Google Calendar** in your app Settings

---

## ✅ That's It!

After enabling the Calendar API, the 404 error should be resolved and scheduling should work!



