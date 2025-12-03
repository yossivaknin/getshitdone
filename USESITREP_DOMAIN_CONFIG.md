# Configuration Checklist for usesitrep.com

This document lists all the changes you need to make to configure your app to work with the domain **usesitrep.com**.

---

## ✅ 1. Vercel Environment Variables (REQUIRED)

**Location:** Vercel Dashboard → Your Project → Settings → Environment Variables

### Update this variable:
```
NEXT_PUBLIC_APP_URL=https://usesitrep.com
```

**Steps:**
1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Select your project
3. Go to **Settings** → **Environment Variables**
4. Find `NEXT_PUBLIC_APP_URL`
5. Update the value to: `https://usesitrep.com`
6. Make sure it's enabled for **Production**, **Preview**, and **Development**
7. Click **Save**

### After updating:
- Go to **Deployments** tab
- Click the **3 dots (⋯)** on the latest deployment
- Click **"Redeploy"** to apply the changes

**Why:** This tells your app what domain to use for OAuth redirects.

---

## ✅ 2. Google Cloud Console - OAuth Redirect URIs (REQUIRED)

**Location:** [Google Cloud Console](https://console.cloud.google.com/) → APIs & Services → Credentials

### Add this redirect URI:

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select your project
3. Navigate to **APIs & Services** → **Credentials**
4. Click on your **OAuth 2.0 Client ID**
5. Under **"Authorized redirect URIs"**, add:
   ```
   https://usesitrep.com/auth/callback
   ```
6. **Keep existing URIs** (like `http://localhost:3000/auth/callback` for local dev)
7. Click **"Save"**

**Why:** Google OAuth needs to know it's allowed to redirect back to your production domain after authentication.

---

## ✅ 3. Supabase Dashboard - Redirect URLs (REQUIRED)

**Location:** [Supabase Dashboard](https://app.supabase.com/) → Your Project → Authentication → URL Configuration

### Add this redirect URL:

1. Go to [Supabase Dashboard](https://app.supabase.com/)
2. Select your project
3. Navigate to **Authentication** → **URL Configuration**
4. Under **"Redirect URLs"**, add:
   ```
   https://usesitrep.com/auth/callback
   ```
5. **Keep existing URLs** (like `http://localhost:3000/auth/callback` for local dev)
6. Click **"Save"**

**Why:** Supabase Auth needs to know it's allowed to redirect back to your production domain after OAuth authentication.

---

## ✅ 4. Verify Vercel Domain Configuration

**Location:** Vercel Dashboard → Your Project → Settings → Domains

### Check:
1. Go to **Settings** → **Domains**
2. Verify `usesitrep.com` is listed
3. Status should show **"Valid Configuration"** (green checkmark)
4. If it shows "Invalid Configuration", check your DNS settings in GoDaddy

**DNS Records in GoDaddy should be:**
- **Type:** A or CNAME (depending on what Vercel shows)
- **Name:** `@` (for root domain) or your subdomain
- **Value:** The value Vercel provided (usually an IP or CNAME target)

---

## ✅ 5. Verify All Environment Variables in Vercel

**Location:** Vercel Dashboard → Your Project → Settings → Environment Variables

### Required Variables (verify all are set):

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
NEXT_PUBLIC_APP_URL=https://usesitrep.com
```

**Important:**
- All variables should be enabled for **Production**, **Preview**, and **Development**
- `NEXT_PUBLIC_APP_URL` must be exactly `https://usesitrep.com` (with `https://` and no trailing slash)

---

## ✅ 6. Test All Functionality

After making the above changes, test:

### A. Basic Access
- [ ] Visit `https://usesitrep.com` - should load the app
- [ ] Should redirect to `/login` if not authenticated
- [ ] HTTPS should be working (lock icon in browser)

### B. Email/Password Authentication
- [ ] Sign up with email/password - should work
- [ ] Login with email/password - should work
- [ ] Should redirect to home page after login

### C. Google OAuth Login
- [ ] Click "CONTINUE WITH GOOGLE" button
- [ ] Should redirect to Google login page
- [ ] After Google authentication, should redirect back to `https://usesitrep.com`
- [ ] Should be logged in successfully

### D. PWA Features (if configured)
- [ ] Open on mobile device
- [ ] Should show "Add to Home Screen" option
- [ ] Icons should display correctly

---

## 🔍 Code Review (Already Configured - No Changes Needed)

The following code files already use environment variables correctly, so they will automatically work with your domain:

✅ **`src/app/login/actions.ts`** - Uses `process.env.NEXT_PUBLIC_APP_URL` for OAuth redirects
✅ **`src/app/auth/callback/route.ts`** - Uses dynamic URL construction
✅ **`public/manifest.json`** - Uses relative paths (works with any domain)
✅ **`src/app/layout.tsx`** - PWA metadata uses relative paths

**No code changes needed!** 🎉

---

## 📋 Quick Checklist Summary

- [ ] **Vercel:** Update `NEXT_PUBLIC_APP_URL` to `https://usesitrep.com`
- [ ] **Vercel:** Redeploy after updating environment variable
- [ ] **Google Cloud Console:** Add `https://usesitrep.com/auth/callback` to OAuth redirect URIs
- [ ] **Supabase:** Add `https://usesitrep.com/auth/callback` to redirect URLs
- [ ] **Test:** Email/password login works
- [ ] **Test:** Google OAuth login works
- [ ] **Test:** HTTPS is working
- [ ] **Test:** Domain loads correctly

---

## 🆘 Troubleshooting

### "Redirect URI mismatch" error
- **Cause:** Google OAuth redirect URI doesn't match
- **Fix:** Double-check Google Cloud Console has `https://usesitrep.com/auth/callback` exactly (case-sensitive, must include `https://`)

### "Authentication failed" after Google login
- **Cause:** Supabase redirect URL not configured
- **Fix:** Add `https://usesitrep.com/auth/callback` to Supabase redirect URLs

### App still redirects to old domain
- **Cause:** Environment variable not updated or not redeployed
- **Fix:** 
  1. Verify `NEXT_PUBLIC_APP_URL` in Vercel is `https://usesitrep.com`
  2. Redeploy the app in Vercel
  3. Clear browser cache and cookies

### Domain shows "Invalid Configuration" in Vercel
- **Cause:** DNS not properly configured
- **Fix:** 
  1. Check DNS records in GoDaddy match what Vercel shows
  2. Wait up to 24 hours for DNS propagation (usually 5-60 minutes)
  3. Use a DNS checker tool to verify propagation

---

## 🎉 You're Done!

Once all the above steps are completed, your app should be fully functional at **usesitrep.com**!

**Next Steps:**
- Monitor the app for any issues
- Share the domain with users
- Set up monitoring/analytics (optional)

