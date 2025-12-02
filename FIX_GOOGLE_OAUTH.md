# Fix Google OAuth Login Error

## 🚨 The Problem

You're seeing "An error occurred during Google login" because Google OAuth is not properly configured in Supabase.

---

## ✅ The Solution - 3 Steps

### Step 1: Enable Google Provider in Supabase (5 minutes)

1. **Go to Supabase Dashboard:**
   - Visit: https://app.supabase.com/
   - Select your project

2. **Navigate to Authentication:**
   - Click **"Authentication"** in the left sidebar
   - Click **"Providers"** tab

3. **Enable Google:**
   - Find **"Google"** in the list of providers
   - Click the toggle to **enable** it (should turn green/blue)

4. **Configure Google OAuth:**
   - You'll see fields for:
     - **Client ID (for OAuth)**
     - **Client Secret (for OAuth)**
   
   **If these are empty**, you need to create Google OAuth credentials first (see Step 2).

   **If you already have credentials**, paste them here:
   - Client ID: `938700376037-suq18cmtjgnbq9p00a17flv04gdlg4b0.apps.googleusercontent.com`
   - Client Secret: `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`

5. **Click "Save"**

---

### Step 2: Create Google OAuth Credentials (10 minutes)

**Only do this if you don't have Google OAuth credentials yet.**

1. **Go to Google Cloud Console:**
   - Visit: https://console.cloud.google.com/
   - Select your project (or create one)

2. **Enable Google+ API:**
   - Go to **"APIs & Services"** → **"Library"**
   - Search for **"Google+ API"** or **"Google Identity"**
   - Click **"Enable"**

3. **Configure OAuth Consent Screen (if prompted):**
   - Go to **"APIs & Services"** → **"OAuth consent screen"**
   - If you see "User Type" options:
     - **External**: Choose this if you want anyone with a Google account to use your app
     - **Internal**: Only available if you have Google Workspace (G Suite) - limits to your organization
   - If you DON'T see "User Type" option:
     - This means your account type is already determined
     - Just fill in the required fields:
       - **App name**: `SitRep` (or your app name)
       - **User support email**: Your email
       - **Developer contact**: Your email
   - Click **"Save and Continue"** through all steps
   - You may need to add a test user if your app is in "Testing" mode

4. **Create OAuth Credentials:**
   - Go to **"APIs & Services"** → **"Credentials"**
   - Click **"Create Credentials"** → **"OAuth client ID"**
   - If you haven't configured the consent screen, you'll be prompted to do so first

5. **Create OAuth Client:**
   - Application type: **Web application**
   - Name: **SitRep Web Client**
   - **Authorized JavaScript origins:**
     - `https://usesitrep.com`
     - `http://localhost:3000` (for local dev)
   - **Authorized redirect URIs:**
     - **IMPORTANT:** This must be your **Supabase callback URL**, not your app URL!
     - Format: `https://YOUR_PROJECT_REF.supabase.co/auth/v1/callback`
     - To find your project ref: Supabase Dashboard → Settings → API → look at your Project URL
     - Example: If your Supabase URL is `https://abcdefghijklmnop.supabase.co`, then:
       - Redirect URI: `https://abcdefghijklmnop.supabase.co/auth/v1/callback`
     - Also add: `http://localhost:3000/auth/callback` (for local dev)
   - Click **"Create"**

6. **Copy Credentials:**
   - A popup will show:
     - **Your Client ID** (copy this)
     - **Your Client Secret** (copy this - you won't see it again!)
   - Paste these into Supabase (Step 1, item 4)

---

### Step 3: Configure Supabase Redirect URLs (2 minutes)

1. **Go to Supabase Dashboard:**
   - Visit: https://app.supabase.com/
   - Select your project

2. **Navigate to URL Configuration:**
   - Click **"Authentication"** → **"URL Configuration"**

3. **Add Redirect URL:**
   - Under **"Redirect URLs"**, add:
     ```
     https://usesitrep.com/auth/callback
     ```
   - Also keep: `http://localhost:3000/auth/callback` (for local dev)

4. **Click "Save"**

---

## ✅ Verification Checklist

After completing all steps:

- [ ] Google provider is **enabled** in Supabase (green/blue toggle)
- [ ] Google Client ID is set in Supabase
- [ ] Google Client Secret is set in Supabase
- [ ] Google Cloud Console has Supabase callback URL: `https://YOUR_PROJECT_REF.supabase.co/auth/v1/callback`
- [ ] Supabase has your app callback URL: `https://usesitrep.com/auth/callback`
- [ ] Both redirect URLs are saved

---

## 🔍 How OAuth Flow Works

1. User clicks "Continue with Google"
2. App redirects to **Supabase OAuth endpoint**
3. Supabase redirects to **Google login**
4. User authenticates with Google
5. Google redirects back to **Supabase callback**: `https://YOUR_PROJECT_REF.supabase.co/auth/v1/callback`
6. Supabase processes the OAuth code
7. Supabase redirects to **your app callback**: `https://usesitrep.com/auth/callback`
8. Your app exchanges the code for a session

**Key Point:** Google needs to know about the Supabase callback URL, not your app URL directly!

---

## 🆘 Troubleshooting

### "OAuth not configured" error
- **Solution:** Make sure Google provider is enabled in Supabase and credentials are set

### "Redirect URI mismatch" error
- **Solution:** 
  - Google Cloud Console redirect URI must be: `https://YOUR_PROJECT_REF.supabase.co/auth/v1/callback`
  - Check your Supabase project reference in Settings → API

### "Invalid client" error
- **Solution:** Check that Client ID and Secret in Supabase match what's in Google Cloud Console

### Still getting generic error
- **Solution:** 
  1. Check Vercel Function Logs for the exact error
  2. Verify all redirect URLs are saved in both Google Cloud Console and Supabase
  3. Make sure you redeployed after any changes

---

## 📋 Quick Reference

**Supabase Dashboard:**
- Authentication → Providers → Google (enable and add credentials)
- Authentication → URL Configuration → Redirect URLs (add your app URL)

**Google Cloud Console:**
- APIs & Services → Credentials → OAuth Client
- Authorized redirect URI: `https://YOUR_PROJECT_REF.supabase.co/auth/v1/callback`

**Your Supabase Project Reference:**
- Find in: Supabase Dashboard → Settings → API → Project URL
- It's the part before `.supabase.co`
- Example: `https://abcdefghijklmnop.supabase.co` → project ref is `abcdefghijklmnop`

