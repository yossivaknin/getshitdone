# OAuth Configuration - Clarified for iOS

## Understanding the OAuth Flow

When you click "Continue with Google" in the mobile app:

1. **App** → Calls Supabase `signInWithOAuth` with `redirectTo: 'com.sitrep.app://auth/callback'`
2. **Supabase** → Redirects to Google OAuth
3. **Google** → User authorizes, redirects back to **Supabase's callback URL**
4. **Supabase** → Exchanges code for session, then redirects to `com.sitrep.app://auth/callback`
5. **App** → Receives deep link, exchanges code for session client-side

## Critical Configurations

### 1. **Supabase Dashboard** ⚠️ MOST IMPORTANT
   - Go to: https://supabase.com/dashboard → Your Project → Authentication → URL Configuration
   - **Site URL:** `https://usesitrep.com`
   - **Redirect URLs:** Must include:
     ```
     https://usesitrep.com/auth/callback
     http://localhost:3000/auth/callback
     com.sitrep.app://auth/callback  ← THIS IS CRITICAL FOR MOBILE
     ```
   - ✅ **This is where Supabase will redirect after OAuth completes**

### 2. **Google Cloud Console - Web OAuth Client** (Not iOS Client)
   - Go to: https://console.cloud.google.com/apis/credentials
   - Find your **Web OAuth Client** (the one Supabase uses)
   - **Authorized redirect URIs** must include:
     ```
     https://[your-project].supabase.co/auth/v1/callback
     ```
   - ⚠️ **This is Supabase's callback URL, not your app's URL**
   - ✅ **iOS OAuth Client doesn't need redirect URIs** (uses reversed client ID scheme)

### 3. **Google Cloud Console - iOS OAuth Client**
   - Your iOS Client ID: `342417702886-lr21gi6fetojm2e1lrp0vqad1vt9np6s.apps.googleusercontent.com`
   - ✅ **Already configured in Info.plist as reversed client ID**
   - ✅ **No redirect URIs needed** (iOS uses URL schemes)

### 4. **Vercel Environment Variables**
   - `NEXT_PUBLIC_APP_URL` = `https://usesitrep.com`
   - `NEXT_PUBLIC_SUPABASE_URL` = Your Supabase project URL
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = Your Supabase anon key

## Most Common Issue

**Supabase Redirect URLs missing `com.sitrep.app://auth/callback`**

Without this, Supabase will reject the redirect after OAuth completes, causing:
- White screen
- Session exchange failure
- Redirect loop

## How to Find Your Supabase Callback URL

1. Go to Supabase Dashboard → Your Project
2. Check `NEXT_PUBLIC_SUPABASE_URL` in your `.env.local` or Vercel
3. Your callback URL is: `https://[project-ref].supabase.co/auth/v1/callback`
4. This must be in Google Cloud Console → Web OAuth Client → Authorized redirect URIs

## Debug Checklist

- [ ] Supabase has `com.sitrep.app://auth/callback` in Redirect URLs
- [ ] Google Web OAuth Client has Supabase callback URL
- [ ] Vercel has `NEXT_PUBLIC_APP_URL=https://usesitrep.com`
- [ ] Info.plist has both URL schemes (already verified ✅)

