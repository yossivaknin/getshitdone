# Google Calendar Integration Setup

## 🎯 What This Does

This allows users to connect their Google Calendar to automatically schedule tasks and sync events.

---

## ✅ Step 1: Create Google OAuth Credentials (10 minutes)

### 1.1 Go to Google Cloud Console

1. Visit [Google Cloud Console](https://console.cloud.google.com/)
2. Sign in with your Google account
3. Select your project (or create a new one)

### 1.2 Enable Google Calendar API

1. Go to **"APIs & Services"** → **"Library"**
2. Search for **"Google Calendar API"**
3. Click on it and click **"Enable"**f

### 1.3 Configure OAuth Consent Screen

1. Go to **"APIs & Services"** → **"OAuth consent screen"**
2. Choose **"External"** (unless you have Google Workspace)
3. Click **"Create"**
4. Fill in:
   - **App name**: `SitRep` (or your app name)
   - **User support email**: Your email
   - **Developer contact information**: Your email
5. Click **"Save and Continue"**
6. On **"Scopes"** page:
   - Click **"Add or Remove Scopes"**
   - Search for and add: `https://www.googleapis.com/auth/calendar`
   - Click **"Update"** → **"Save and Continue"**
7. On **"Test users"** page: Add your email (or skip if publishing)
8. Click **"Save and Continue"** → **"Back to Dashboard"**

### 1.4 Create OAuth 2.0 Credentials

1. Go to **"APIs & Services"** → **"Credentials"**
2. Click **"+ CREATE CREDENTIALS"** → **"OAuth client ID"**
3. Select **"Web application"**
4. Fill in:
   - **Name**: `SitRep Calendar Client` (or any name)
   - **Authorized JavaScript origins**: 
     - `http://localhost:3000` (for local development)
     - `https://usesitrep.com` (for production)
   - **Authorized redirect URIs**:
     - `http://localhost:3000/api/auth/google/callback` (for local)
     - `https://usesitrep.com/api/auth/google/callback` (for production)
5. Click **"Create"**
6. **Copy the Client ID and Client Secret** (you'll need these!)

---

## ✅ Step 2: Add Environment Variables

### For Local Development (.env.local)

1. Create/update `.env.local` in your project root:
   ```bash
   NEXT_PUBLIC_GOOGLE_CLIENT_ID=your-client-id-here.apps.googleusercontent.com
   GOOGLE_CLIENT_SECRET=your-client-secret-here
   ```

2. Replace with your actual values from Step 1.4

### For Production (Vercel)

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Select your project (`getshitdone` or similar)
3. Go to **"Settings"** → **"Environment Variables"**
4. Add these variables:

   **Variable 1:**
   - **Name**: `NEXT_PUBLIC_GOOGLE_CLIENT_ID`
   - **Value**: Your Google Client ID (from Step 1.4)
   - **Environment**: Production, Preview, Development (select all)

   **Variable 2:**
   - **Name**: `GOOGLE_CLIENT_SECRET`
   - **Value**: Your Google Client Secret (from Step 1.4)
   - **Environment**: Production, Preview, Development (select all)

5. Click **"Save"**
6. **Redeploy** your app (Vercel will automatically redeploy, or click "Redeploy" in Deployments)

---

## ✅ Step 3: Verify Setup

1. Go to your app → **Settings** page
2. Click **"Connect Google Calendar"**
3. You should be redirected to Google to authorize
4. After authorizing, you'll be redirected back
5. You should see "Successfully connected to Google Calendar!"

---

## 🔍 Troubleshooting

### "Google Client ID not configured"
- ✅ Make sure `NEXT_PUBLIC_GOOGLE_CLIENT_ID` is set in Vercel
- ✅ Make sure you redeployed after adding the variable
- ✅ Check that the variable name is exactly `NEXT_PUBLIC_GOOGLE_CLIENT_ID` (case-sensitive)

### "Redirect URI mismatch"
- ✅ Make sure the redirect URI in Google Cloud Console matches exactly:
  - Production: `https://usesitrep.com/api/auth/google/callback`
  - Local: `http://localhost:3000/api/auth/google/callback`
- ✅ No trailing slashes!

### "Access blocked: This app's request is invalid"
- ✅ Make sure Google Calendar API is enabled
- ✅ Make sure the OAuth consent screen is configured
- ✅ Make sure you added the correct scope: `https://www.googleapis.com/auth/calendar`

### Still not working?
1. Check browser console (F12) for errors
2. Check Vercel logs for server errors
3. Verify environment variables are set correctly in Vercel

---

## 📋 Quick Checklist

- [ ] Google Calendar API enabled in Google Cloud Console
- [ ] OAuth consent screen configured
- [ ] OAuth client created with correct redirect URIs
- [ ] `NEXT_PUBLIC_GOOGLE_CLIENT_ID` added to Vercel
- [ ] `GOOGLE_CLIENT_SECRET` added to Vercel
- [ ] App redeployed after adding variables
- [ ] Tested connection in Settings page

---

## 🔐 Security Notes

- **Never commit** `.env.local` to git (it's in `.gitignore`)
- **Client Secret** should only be in server-side code (not exposed to browser)
- The `NEXT_PUBLIC_` prefix makes the Client ID available to the browser (this is OK)
- The Client Secret is only used server-side (in the callback route)

---

**That's it!** Once set up, users can connect their Google Calendar and tasks will sync automatically.

