# Production Deployment Checklist - GoDaddy Domain

## ✅ Pre-Deployment Checklist

### 1. Commit All Changes
```bash
cd /Users/yossivaknin/Desktop/april/code/get-shit-done
git add .
git commit -m "Ready for production deployment"
git push origin main
```

### 2. Create PWA Icons (Optional but Recommended)
- Generate `public/icon-192.png` (192x192px)
- Generate `public/icon-512.png` (512x512px)
- Use: https://realfavicongenerator.net/ or https://www.pwabuilder.com/imageGenerator

---

## 🚀 Step 1: Deploy to Vercel (5 minutes)

### Option A: Via GitHub (Recommended - Auto-deploys on push)

1. **Push to GitHub** (if not already done):
   ```bash
   git push origin main
   ```

2. **Go to [vercel.com](https://vercel.com)**
   - Sign up/login with GitHub
   - Click **"Add New Project"**
   - Import your `getshitdone/sitrep` repository
   - Click **"Deploy"** (Vercel auto-detects Next.js)

3. **Wait for deployment** (~2 minutes)
   - Your app will be live at `sitrep-xxxxx.vercel.app`

### Option B: Via Vercel CLI (Quick Test)

```bash
npm i -g vercel
cd get-shit-done
vercel --prod
```

---

## 🌐 Step 2: Connect GoDaddy Domain (5 minutes)

### In Vercel Dashboard:

1. Go to your project → **Settings** → **Domains**
2. Enter your GoDaddy domain (e.g., `sitrep.com` or `app.sitrep.com`)
3. Click **"Add"**
4. **Copy the DNS records** Vercel shows you (you'll need these!)

### In GoDaddy:

1. Log in to [GoDaddy](https://www.godaddy.com/)
2. Go to **My Products** → Click **DNS** next to your domain
3. **For root domain (`sitrep.com`):**
   - Find the existing **A Record** for `@` pointing to GoDaddy's IP
   - **Edit it** or **Add new A Record**:
     - Type: `A`
     - Name: `@`
     - Value: `76.76.21.21` (or the IP Vercel shows you)
     - TTL: `600` (10 minutes)

4. **For subdomain (`app.sitrep.com`):**
   - Click **"Add"** → **"CNAME"**
   - Name: `app` (or your subdomain)
   - Value: `cname.vercel-dns.com` (or what Vercel shows)
   - TTL: `600`

5. **Save** and wait 5-60 minutes for DNS propagation

6. **Verify in Vercel** - Status will change to "Valid Configuration" when ready

---

## 🔐 Step 3: Set Environment Variables in Vercel (3 minutes)

1. Go to Vercel Dashboard → Your Project → **Settings** → **Environment Variables**

2. **Add these variables** (copy from your `.env.local`):

   ```
   NEXT_PUBLIC_SUPABASE_URL=https://xuwovziafkjdjgxrlgsb.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
   NEXT_PUBLIC_GOOGLE_CLIENT_ID=your-google-client-id
   GOOGLE_CLIENT_SECRET=your-google-client-secret
   NEXT_PUBLIC_APP_URL=https://yourdomain.com
   ```

   **Important:** 
   - Replace `yourdomain.com` with your actual domain
   - Use your production Supabase keys (if different from dev)
   - Make sure `NEXT_PUBLIC_APP_URL` matches your domain exactly

3. **Select environments:** Check "Production", "Preview", and "Development"

4. **Redeploy:**
   - Go to **Deployments**
   - Click the **3 dots** (⋯) on the latest deployment
   - Click **"Redeploy"**
   - This applies the new environment variables

---

## 🔄 Step 4: Update OAuth Redirect URIs (5 minutes)

### Google OAuth (for Google Login):

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. **APIs & Services** → **Credentials**
3. Click on your OAuth 2.0 Client ID
4. Under **"Authorized redirect URIs"**, add:
   - `https://yourdomain.com/auth/callback`
   - (Keep `http://localhost:3000/auth/callback` for local dev)
5. Click **"Save"**

### Supabase (for Google OAuth via Supabase):

1. Go to [Supabase Dashboard](https://app.supabase.com/)
2. Your Project → **Authentication** → **URL Configuration**
3. Under **"Redirect URLs"**, add:
   - `https://yourdomain.com/auth/callback`
   - (Keep `http://localhost:3000/auth/callback` for local dev)
4. Click **"Save"**

---

## ✅ Step 5: Test Everything (5 minutes)

1. **Visit your domain**: `https://yourdomain.com`
   - Should load your app
   - Should redirect to `/login` if not authenticated

2. **Test Email/Password Login:**
   - Create an account or log in
   - Should redirect to home page

3. **Test Google Login:**
   - Click "CONTINUE WITH GOOGLE"
   - Complete Google authentication
   - Should redirect back and log you in

4. **Test PWA (if icons added):**
   - Open on mobile
   - Should show "Add to Home Screen" option

5. **Check HTTPS:**
   - Vercel automatically provides SSL certificates
   - Should see the lock icon in browser

---

## 🎯 Step 6: Set Up Auto-Deployments

Your app is already set up for auto-deployment! Every time you push to GitHub:

```bash
git add .
git commit -m "Your changes"
git push origin main
```

Vercel will automatically:
- Build your app
- Deploy to production
- Update your live site

---

## 🔒 Security Checklist

- [ ] All secrets are in Vercel Environment Variables (not in code)
- [ ] `.env.local` is in `.gitignore` (not committed)
- [ ] HTTPS is enabled (automatic with Vercel)
- [ ] OAuth redirect URIs only include your domain
- [ ] Supabase RLS (Row Level Security) is enabled (if using database)

---

## 🆘 Troubleshooting

### Domain shows "Invalid Configuration"
- Wait up to 24 hours for DNS propagation (usually 5-60 minutes)
- Double-check DNS records match exactly what Vercel shows
- Make sure you're using the correct record type (A for root, CNAME for subdomain)

### "Authentication failed" after Google login
- Check Supabase redirect URL includes your production domain
- Verify Google OAuth redirect URI includes your domain
- Check browser console for errors

### Environment variables not working
- Make sure you **Redeployed** after adding variables
- Check variable names are exact (case-sensitive)
- Verify you selected "Production" environment when adding

### Build fails on Vercel
- Check build logs in Vercel dashboard
- Make sure all dependencies are in `package.json`
- Verify Node.js version compatibility

---

## 📊 Monitoring

- **Vercel Dashboard**: View deployments, logs, and analytics
- **Supabase Dashboard**: Monitor database and auth usage
- **Google Cloud Console**: Monitor OAuth usage

---

## 💰 Cost Estimate

- **Vercel Free Tier**: 
  - 100GB bandwidth/month
  - Unlimited requests
  - Perfect for starting out!
- **Supabase Free Tier**: 
  - 500MB database
  - 50,000 monthly active users
  - 2GB file storage

**Total: $0/month** for small to medium usage! 🎉

---

## 🎉 You're Live!

Your SitRep app is now in production at your GoDaddy domain!

**Next Steps:**
- Share your domain with users
- Monitor usage in Vercel/Supabase dashboards
- Set up custom error pages (optional)
- Add analytics (optional)

