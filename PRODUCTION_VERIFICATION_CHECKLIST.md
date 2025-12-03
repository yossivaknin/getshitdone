# Production Verification Checklist for usesitrep.com

## 🔍 Current Status Check

### 1. Visit the Site
- Go to: **https://usesitrep.com**
- What do you see?
  - [ ] Login page loads correctly
  - [ ] Error message appears
  - [ ] Page doesn't load at all

### 2. Test Email/Password Login
- Try to sign up with a new email
- What error message do you see?
  - [ ] "Configuration error: ..."
  - [ ] "Login failed: ..."
  - [ ] "An error occurred during login..."
  - [ ] Other: _______________

### 3. Test Google OAuth
- Click "CONTINUE WITH GOOGLE"
- What happens?
  - [ ] Redirects to Google login
  - [ ] Shows error message
  - [ ] Nothing happens

---

## ✅ Verification Steps

### Step 1: Check Vercel Environment Variables

1. Go to: [Vercel Dashboard](https://vercel.com/dashboard)
2. Select your project
3. Go to **Settings** → **Environment Variables**
4. Verify these are set:

```
✅ NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
✅ NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
✅ NEXT_PUBLIC_APP_URL=https://usesitrep.com
```

**Important:**
- All must be enabled for **Production** environment
- No trailing slashes
- Exact variable names (case-sensitive)

### Step 2: Verify Latest Deployment

1. Go to **Deployments** tab
2. Check the latest deployment:
   - [ ] Status is "Ready" (green checkmark)
   - [ ] Commit includes latest changes
   - [ ] No build errors

3. If not latest:
   - Click **3 dots (⋯)** → **Redeploy**

### Step 3: Check Supabase Configuration

1. Go to: [Supabase Dashboard](https://app.supabase.com/)
2. Select your project
3. **Authentication** → **URL Configuration**
4. Verify **Redirect URLs** includes:
   ```
   https://usesitrep.com/auth/callback
   ```

### Step 4: Check Google OAuth (if using Google login)

1. Go to: [Google Cloud Console](https://console.cloud.google.com/)
2. **APIs & Services** → **Credentials**
3. Click your OAuth Client
4. Verify **Authorized redirect URIs** includes:
   ```
   https://YOUR_PROJECT_REF.supabase.co/auth/v1/callback
   ```
   (Replace YOUR_PROJECT_REF with your Supabase project reference)

5. Go to: [Supabase Dashboard](https://app.supabase.com/)
6. **Authentication** → **Providers** → **Google**
7. Verify:
   - [ ] Google provider is **enabled** (toggle ON)
   - [ ] Client ID is filled in
   - [ ] Client Secret is filled in
   - [ ] Clicked **Save**

---

## 🐛 Common Issues & Fixes

### Issue: "Configuration error: NEXT_PUBLIC_SUPABASE_URL is missing"
**Fix:**
- Add environment variables in Vercel
- Make sure they're enabled for **Production**
- **Redeploy** after adding

### Issue: "Login failed: Invalid login credentials"
**Fix:**
- This is normal if the user doesn't exist
- Try signing up first, then logging in

### Issue: "Please check your email to confirm your account"
**Fix:**
- This means email confirmation is enabled in Supabase
- Check your email for confirmation link
- Or disable email confirmation in Supabase → Authentication → Settings

### Issue: Google OAuth doesn't work
**Fix:**
- Verify Google provider is enabled in Supabase
- Check redirect URLs are set correctly (see Step 4 above)
- Make sure you redeployed after any changes

---

## 📋 Quick Test

1. **Visit:** https://usesitrep.com
2. **Try to sign up** with a new email
3. **Note the exact error message**
4. **Share the error** so we can fix it

---

## 🔍 What to Share

If it's still not working, please share:

1. **The exact error message** you see on https://usesitrep.com
2. **Which method you tried:**
   - [ ] Email/password signup
   - [ ] Email/password login
   - [ ] Google OAuth
3. **Vercel deployment status:**
   - Latest deployment commit hash
   - Any build errors

This will help identify the exact issue!

