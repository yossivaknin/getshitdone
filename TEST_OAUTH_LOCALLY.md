# Testing Google OAuth Locally

## Server Status
✅ Development server is running at: **http://localhost:3000**

---

## How to Test

1. **Open your browser:**
   - Go to: http://localhost:3000
   - You should see the login page

2. **Click "CONTINUE WITH GOOGLE"**

3. **What to check:**
   - Does it redirect to Google login?
   - After Google login, does it redirect back?
   - What error message do you see (if any)?

---

## Common Issues & Fixes

### Issue 1: "OAuth not configured"
**Error:** "Google login failed: OAuth not configured"

**Fix:**
- Go to Supabase Dashboard → Authentication → Providers
- Make sure Google is **enabled** (toggle is ON)
- Make sure Client ID and Secret are filled in
- Click **Save**

### Issue 2: "Redirect URI mismatch"
**Error:** "redirect_uri_mismatch" or similar

**Fix:**
- Check Google Cloud Console → OAuth Client
- Authorized redirect URI must be: `https://YOUR_PROJECT_REF.supabase.co/auth/v1/callback`
- Check Supabase → Authentication → URL Configuration
- Redirect URL must include: `http://localhost:3000/auth/callback`

### Issue 3: "Configuration error"
**Error:** "Configuration error: NEXT_PUBLIC_SUPABASE_URL is missing"

**Fix:**
- Check your `.env.local` file
- Make sure it has:
  ```
  NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
  NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
  ```
- Restart the dev server after adding variables

### Issue 4: Nothing happens when clicking button
**Possible causes:**
- Check browser console for errors (F12 → Console)
- Check terminal where `npm run dev` is running for errors
- Make sure Supabase environment variables are set

---

## Debug Steps

1. **Check browser console:**
   - Press F12
   - Go to Console tab
   - Look for any red errors
   - Share the error message

2. **Check terminal output:**
   - Look at the terminal where `npm run dev` is running
   - Look for any error messages
   - The code logs: "Initiating Google OAuth with redirect URL: ..."

3. **Check Supabase Dashboard:**
   - Authentication → Providers → Google
   - Is it enabled?
   - Are credentials filled in?

4. **Check Google Cloud Console:**
   - APIs & Services → Credentials
   - Is the OAuth client created?
   - Is the redirect URI correct?

---

## What to Share

If it's still not working, please share:

1. **The exact error message** you see on the page
2. **Browser console errors** (F12 → Console)
3. **Terminal output** from `npm run dev`
4. **Screenshot** of Supabase → Authentication → Providers → Google (hide the secret!)

This will help identify the exact issue!

