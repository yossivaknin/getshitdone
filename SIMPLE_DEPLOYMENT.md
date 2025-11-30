# Simple Deployment Guide - Vercel + GoDaddy

This is the **easiest way** to get your SitRep app live on your GoDaddy domain.

## 🚀 Step 1: Deploy to Vercel (5 minutes)

### Option A: Deploy via GitHub (Recommended)

1. **Push your code to GitHub**
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git remote add origin https://github.com/YOUR_USERNAME/sitrep.git
   git push -u origin main
   ```

2. **Go to [vercel.com](https://vercel.com)**
   - Sign up/login with GitHub
   - Click **"Add New Project"**
   - Import your GitHub repository
   - Click **"Deploy"** (no configuration needed!)

3. **Done!** Your app is live at `your-app.vercel.app`

### Option B: Deploy via Vercel CLI (Even Faster)

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
cd get-shit-done
vercel

# Follow the prompts:
# - Set up and deploy? Yes
# - Which scope? (your account)
# - Link to existing project? No
# - Project name? sitrep
# - Directory? ./
# - Override settings? No
```

## 🌐 Step 2: Connect Your GoDaddy Domain (5 minutes)

1. **In Vercel Dashboard:**
   - Go to your project → **Settings** → **Domains**
   - Enter your domain (e.g., `sitrep.com` or `app.sitrep.com`)
   - Click **"Add"**

2. **In GoDaddy:**
   - Log in to GoDaddy
   - Go to **DNS Management** for your domain
   - **For root domain (sitrep.com):**
     - Add an **A Record**:
       - Type: `A`
       - Name: `@`
       - Value: `76.76.21.21` (Vercel's IP - they'll show you the exact IP)
       - TTL: `600`
   - **For subdomain (app.sitrep.com):**
     - Add a **CNAME Record**:
       - Type: `CNAME`
       - Name: `app` (or whatever subdomain you want)
       - Value: `cname.vercel-dns.com` (Vercel will show you the exact value)
       - TTL: `600`

3. **Wait 5-60 minutes** for DNS to propagate

4. **Verify in Vercel** - it will show "Valid Configuration" when ready

## 🔐 Step 3: Set Environment Variables (2 minutes)

In Vercel Dashboard → Your Project → **Settings** → **Environment Variables**, add:

```
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
NEXT_PUBLIC_APP_URL=https://yourdomain.com
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url (if using)
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-key (if using)
```

**Important:** After adding variables, go to **Deployments** → Click the 3 dots on latest deployment → **Redeploy** to apply changes.

## 🔄 Step 4: Update Google OAuth Redirect URI

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. **APIs & Services** → **Credentials**
3. Edit your OAuth 2.0 Client ID
4. Add authorized redirect URI: `https://yourdomain.com/api/auth/google/callback`
5. Save

## ✅ That's It!

Your app is now live at your GoDaddy domain!

## 📱 PWA Icons (Optional but Recommended)

Create these files in `public/`:
- `icon-192.png` (192x192px)
- `icon-512.png` (512x512px)

Use: https://realfavicongenerator.net/

## 🎯 Future Deployments

**Automatic:** Just push to GitHub → Vercel auto-deploys!

```bash
git add .
git commit -m "Your changes"
git push
```

## 💰 Cost

- **Vercel Free Tier:** 
  - Unlimited personal projects
  - 100GB bandwidth/month
  - Perfect for starting out!

## 🆘 Troubleshooting

### Domain not working?
- Wait up to 24 hours for DNS propagation
- Check DNS records match exactly what Vercel shows
- Verify in Vercel dashboard shows "Valid Configuration"

### Environment variables not working?
- Make sure to **Redeploy** after adding variables
- Check variable names match exactly (case-sensitive)

### Build fails?
- Check Vercel build logs
- Make sure all dependencies are in `package.json`

## 🎉 You're Done!

Your app is live and will auto-deploy on every GitHub push. No Docker, no complex setup, just works!

