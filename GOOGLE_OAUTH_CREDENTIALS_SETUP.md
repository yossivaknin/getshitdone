# How to Get Google OAuth Credentials (Client ID and Secret)

## Step-by-Step Guide

### Step 1: Go to Google Cloud Console

1. Visit [Google Cloud Console](https://console.cloud.google.com/)
2. Sign in with your Google account

### Step 2: Create or Select a Project

1. Click the **project dropdown** at the top (next to "Google Cloud")
2. Either:
   - **Select an existing project**, OR
   - **Click "New Project"** to create one:
     - Project name: `SitRep` (or any name)
     - Click **"Create"**
     - Wait for project creation (takes a few seconds)

### Step 3: Enable Required APIs

1. In the left sidebar, go to **"APIs & Services"** → **"Library"**
2. Search for **"Google+ API"** or **"People API"** (for basic profile info)
3. Click on it and click **"Enable"**
4. (Optional but recommended) Also enable **"Google Calendar API"** if you want calendar integration

### Step 4: Configure OAuth Consent Screen

1. Go to **"APIs & Services"** → **"OAuth consent screen"**
2. Choose **"External"** (unless you have a Google Workspace account)
3. Click **"Create"**
4. Fill in the required fields:
   - **App name**: `SitRep` (or your app name)
   - **User support email**: Your email
   - **Developer contact information**: Your email
5. Click **"Save and Continue"**
6. On **"Scopes"** page, click **"Save and Continue"** (you can add scopes later)
7. On **"Test users"** page (if external), click **"Save and Continue"**
8. On **"Summary"** page, click **"Back to Dashboard"**

### Step 5: Create OAuth 2.0 Credentials

1. Go to **"APIs & Services"** → **"Credentials"**
2. Click **"+ CREATE CREDENTIALS"** at the top
3. Select **"OAuth client ID"**
4. If prompted, choose **"Web application"** as the application type
5. Fill in the form:
   - **Name**: `SitRep Web Client` (or any name)
   - **Authorized JavaScript origins**:
     - For local development: `http://localhost:3000`
     - For production: `https://yourdomain.com`
   - **Authorized redirect URIs**:
     - For Supabase: `https://YOUR_PROJECT_REF.supabase.co/auth/v1/callback`
       - Replace `YOUR_PROJECT_REF` with your Supabase project reference
       - You can find this in your Supabase Dashboard → Settings → API
     - For local dev: `http://localhost:3000/auth/callback`
6. Click **"Create"**

### Step 6: Copy Your Credentials

After clicking "Create", a popup will appear with:
- **Your Client ID** (looks like: `123456789-abc123def456.apps.googleusercontent.com`)
- **Your Client Secret** (looks like: `GOCSPX-abc123def456xyz789`)

**⚠️ IMPORTANT**: Copy these immediately! You won't be able to see the secret again.

### Step 7: Add to Supabase

1. Go to your [Supabase Dashboard](https://app.supabase.com/)
2. Select your project
3. Go to **"Authentication"** → **"Providers"**
4. Find **"Google"** and click to enable it
5. Paste your **Client ID** and **Client Secret**
6. Click **"Save"**

### Step 8: Add to Your Environment Variables

Add these to your `.env.local` file (for local development):

```env
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your-client-id-here.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret-here
```

**Note**: For production (Vercel), add these in:
- Vercel Dashboard → Your Project → Settings → Environment Variables

## Quick Reference

- **Google Cloud Console**: https://console.cloud.google.com/
- **Supabase Dashboard**: https://app.supabase.com/
- **OAuth Credentials**: APIs & Services → Credentials → Create OAuth Client ID

## Troubleshooting

### "Redirect URI mismatch" error
- Make sure the redirect URI in Google Cloud Console matches exactly:
  - For Supabase: `https://YOUR_PROJECT_REF.supabase.co/auth/v1/callback`
- Check for typos, trailing slashes, http vs https

### "Client ID not found" error
- Verify you copied the Client ID correctly
- Make sure you're using the right project in Google Cloud Console

### Can't see Client Secret
- You can only see it once when created
- If lost, create a new OAuth client ID

## Security Notes

- **Never commit** your Client Secret to Git
- Use environment variables for all secrets
- Rotate secrets if they're accidentally exposed
- Use different credentials for development and production


