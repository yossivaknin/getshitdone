# OAuth Configuration Checklist

## 🔍 Critical Configurations to Verify

### 1. **Supabase Dashboard - Redirect URLs** ⚠️ MOST IMPORTANT
   - Go to: https://supabase.com/dashboard → Your Project → Authentication → URL Configuration
   - **Site URL:** Should be `https://usesitrep.com`
   - **Redirect URLs:** Must include ALL THREE:
     ```
     https://usesitrep.com/auth/callback
     http://localhost:3000/auth/callback
     com.sitrep.app://auth/callback
     ```
   - ✅ **VERIFY:** All three URLs are added (especially the custom URL scheme!)

### 2. **Google Cloud Console - OAuth Redirect URIs**
   - Go to: https://console.cloud.google.com/apis/credentials
   - Find your OAuth 2.0 Client ID (the one used for Supabase)
   - **Authorized redirect URIs** must include:
     ```
     https://usesitrep.com/auth/callback
     http://localhost:3000/auth/callback
     com.sitrep.app://auth/callback
     ```
   - ✅ **VERIFY:** All three URLs are added

### 3. **Vercel Environment Variables**
   - Go to: Vercel Dashboard → Your Project → Settings → Environment Variables
   - **NEXT_PUBLIC_APP_URL** must be: `https://usesitrep.com` (no trailing slash!)
   - ✅ **VERIFY:** Exact match, no trailing slash

### 4. **iOS Info.plist - URL Schemes** ✅ VERIFIED
   - File: `ios/App/App/Info.plist`
   - ✅ Has: `com.sitrep.app`
   - ✅ Has: `com.googleusercontent.apps.342417702886-lr21gi6fetojm2e1lrp0vqad1vt9np6s`

### 5. **Capacitor Config** ✅ VERIFIED
   - ✅ appId: `com.sitrep.app`
   - ✅ server.url: `https://usesitrep.com` (for production)

### 6. **Login Actions** ✅ VERIFIED
   - ✅ Uses `com.sitrep.app://auth/callback` for Capacitor
   - ✅ Uses `https://usesitrep.com/auth/callback` for web

## 🐛 Most Likely Issues

### Issue #1: Supabase Redirect URLs Missing
**SYMPTOM:** Redirect works but then fails or shows white screen
**FIX:** Add `com.sitrep.app://auth/callback` to Supabase Redirect URLs

### Issue #2: Supabase Client Exchange Failing
**SYMPTOM:** Code received but session exchange fails
**CHECK:** Look for `[Capacitor] ❌ Session exchange error` in Xcode logs

### Issue #3: Navigation Still Being Cancelled
**SYMPTOM:** Error -999 or white screen after OAuth
**CHECK:** Look for `[Capacitor] Navigating to app:` in Xcode logs

## 📋 Debug Steps

1. **Check Xcode logs for:**
   - `[Capacitor] App opened with URL:` - Should show the deep link
   - `[Capacitor] Exchanging Supabase code for session directly...` - Should appear
   - `[Capacitor] ✅ Session created successfully` - Should appear
   - `[Capacitor] Navigating to app:` - Should show the final URL

2. **If you see errors:**
   - `Session exchange error` → Check Supabase redirect URLs
   - `Navigation cancelled` → Check if code exchange succeeded
   - `No session in response` → Check Supabase configuration

3. **Test the flow:**
   - Click "Continue with Google"
   - Should redirect to Google OAuth
   - After auth, should return to app via deep link
   - Should see session exchange logs
   - Should navigate to /app

