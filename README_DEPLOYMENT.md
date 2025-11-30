# 🚀 Quick Start: Deploy SitRep to Your GoDaddy Domain

## The Simplest Way (10 minutes total)

### Step 1: Deploy to Vercel (5 min)

**Option A: Via GitHub (Easiest)**
1. Push your code to GitHub
2. Go to [vercel.com](https://vercel.com) and sign up
3. Click "Add New Project"
4. Import your GitHub repo
5. Click "Deploy" - that's it!

**Option B: Via CLI (Fast)**
```bash
npm i -g vercel
cd get-shit-done
vercel
```

Your app is now live at `your-app.vercel.app`!

### Step 2: Connect Your GoDaddy Domain (3 min)

1. **In Vercel:** Project → Settings → Domains → Add your domain
2. **In GoDaddy:** DNS Management → Add the DNS records Vercel shows you
3. Wait 5-60 minutes for DNS to update

### Step 3: Add Environment Variables (2 min)

In Vercel Dashboard → Settings → Environment Variables, add:
- `NEXT_PUBLIC_GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `NEXT_PUBLIC_APP_URL` (your domain)
- Then **Redeploy** to apply

### Step 4: Update Google OAuth

Add `https://yourdomain.com/api/auth/google/callback` to your Google OAuth redirect URIs.

## ✅ Done!

Your app is live! Every time you push to GitHub, it auto-deploys.

**See `SIMPLE_DEPLOYMENT.md` for detailed instructions.**

