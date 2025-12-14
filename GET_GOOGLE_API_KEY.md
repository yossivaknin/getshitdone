# How to Get Google API Key for Calendar API

## 🎯 Why You Need This

When using Supabase OAuth with Google, the project context isn't always clear to Google Calendar API. Adding an API key helps Google identify which project to use, preventing 404 errors.

## 📋 Steps to Get Your API Key

### Step 1: Go to Google Cloud Console

1. Visit: https://console.cloud.google.com/
2. Select your project: **fast-asset-287619** (or your project name)

### Step 2: Navigate to API Credentials

1. Go to **APIs & Services** → **Credentials**
2. Or direct link: https://console.cloud.google.com/apis/credentials

### Step 3: Create API Key

1. Click **"+ CREATE CREDENTIALS"** at the top
2. Select **"API key"**
3. A popup will show your new API key
4. **Copy it immediately** - you won't see it again!

### Step 4: Restrict the API Key (Recommended)

1. Click **"RESTRICT KEY"** in the popup
2. Under **"API restrictions"**:
   - Select **"Restrict key"**
   - Check **"Calendar API"** (or "Google Calendar API")
3. Under **"Application restrictions"** (optional):
   - You can restrict by HTTP referrer for web apps
   - Or leave as "None" for now
4. Click **"SAVE"**

### Step 5: Add to Environment Variables

**Local (.env.local):**
```env
GOOGLE_API_KEY=AIzaSy...your-api-key-here
GOOGLE_PROJECT_ID=fast-asset-287619
GOOGLE_CLOUD_PROJECT_ID=fast-asset-287619
```

**Production (Vercel):**
1. Go to Vercel Dashboard → Your Project → Settings → Environment Variables
2. Add:
   - `GOOGLE_API_KEY` = `AIzaSy...your-api-key-here`
   - `GOOGLE_PROJECT_ID` = `fast-asset-287619`
   - `GOOGLE_CLOUD_PROJECT_ID` = `fast-asset-287619`

## ✅ How It Works

The code now uses **both** methods for project identification:

1. **X-Goog-User-Project header** - Explicitly tells Google which project
2. **API key in query string** - Additional project identification (if provided)

This dual approach ensures maximum compatibility, especially when using Supabase OAuth.

## 🔍 Verify It's Working

After adding the API key:

1. **Check browser console** - API calls should succeed
2. **Try scheduling a task** - Should work without 404 errors
3. **Check Network tab** - Requests should include `?key=...` in the URL

## ⚠️ Security Notes

- **API keys are public** - They can be seen in browser network requests
- **Restrict the key** - Limit it to Calendar API only
- **Use HTTP referrer restrictions** - For production, restrict by domain
- **Don't commit to git** - Keep in `.env.local` and Vercel environment variables

## 🆘 Troubleshooting

### "API key not valid"

- **Check:** Is the API key copied correctly?
- **Check:** Is Calendar API enabled in your project?
- **Check:** Are API restrictions too strict?

### "Still getting 404 errors"

- **Check:** Is `GOOGLE_PROJECT_ID` set correctly?
- **Check:** Is the API key restricted to Calendar API?
- **Check:** Are both `X-Goog-User-Project` header AND API key being sent?

### "API key works but I want to remove it"

The API key is **optional**. The code will work with just the `X-Goog-User-Project` header, but having both provides better project identification when using Supabase OAuth.

## 📚 Related Documentation

- [Google API Keys Documentation](https://cloud.google.com/docs/authentication/api-keys)
- [Restricting API Keys](https://cloud.google.com/docs/authentication/api-keys#restricting_api_keys)



