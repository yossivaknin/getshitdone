# Fix "Configuration error" - Missing Environment Variables

## 🚨 The Problem

You're seeing "Configuration error" because **Supabase environment variables are missing** in Vercel.

## ✅ The Solution - Set Environment Variables in Vercel

### Step 1: Get Your Supabase Credentials

1. Go to [Supabase Dashboard](https://app.supabase.com/)
2. Select your project
3. Go to **Settings** → **API**
4. Copy these values:
   - **Project URL** (e.g., `https://xxxxx.supabase.co`)
   - **anon/public key** (the long string under "Project API keys")

### Step 2: Add to Vercel

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Select your project
3. Go to **Settings** → **Environment Variables**
4. Click **"Add New"**

#### Add Variable 1:
- **Key:** `NEXT_PUBLIC_SUPABASE_URL`
- **Value:** Your Supabase Project URL (from Step 1)
- **Environments:** Check ✅ Production, ✅ Preview, ✅ Development
- Click **"Save"**

#### Add Variable 2:
- **Key:** `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- **Value:** Your Supabase anon/public key (from Step 1)
- **Environments:** Check ✅ Production, ✅ Preview, ✅ Development
- Click **"Save"**

#### Add Variable 3 (if not already set):
- **Key:** `NEXT_PUBLIC_APP_URL`
- **Value:** `https://usesitrep.com`
- **Environments:** Check ✅ Production, ✅ Preview, ✅ Development
- Click **"Save"**

### Step 3: Redeploy

**IMPORTANT:** After adding variables, you MUST redeploy:

1. Go to **Deployments** tab
2. Click the **3 dots (⋯)** on the latest deployment
3. Click **"Redeploy"**
4. Wait for deployment to complete (~2 minutes)

### Step 4: Verify

After redeployment, try login/signup again. The error message will now tell you exactly what's missing if anything is still wrong.

---

## 📋 Quick Checklist

- [ ] `NEXT_PUBLIC_SUPABASE_URL` is set in Vercel
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY` is set in Vercel
- [ ] `NEXT_PUBLIC_APP_URL` is set to `https://usesitrep.com`
- [ ] All variables are enabled for **Production** environment
- [ ] App has been **redeployed** after adding variables
- [ ] No trailing slashes in URLs
- [ ] Variable names are exact (case-sensitive)

---

## 🔍 How to Verify Variables Are Set

1. Go to Vercel Dashboard → Your Project → **Settings** → **Environment Variables**
2. You should see all 3 variables listed
3. Make sure they're enabled for **Production** (green checkmark)

---

## ⚠️ Common Mistakes

1. **Wrong variable name:**
   - ❌ `SUPABASE_URL` (missing `NEXT_PUBLIC_` prefix)
   - ✅ `NEXT_PUBLIC_SUPABASE_URL`

2. **Not redeploying:**
   - Variables only apply to NEW deployments
   - Must click "Redeploy" after adding variables

3. **Wrong environment:**
   - Variables must be enabled for **Production**
   - Check all three: Production, Preview, Development

4. **Trailing slashes:**
   - ❌ `https://xxxxx.supabase.co/`
   - ✅ `https://xxxxx.supabase.co`

---

## 🆘 Still Not Working?

After redeploying, if you still get an error:
1. The error message will now tell you exactly what's missing
2. Check Vercel Function Logs for more details
3. Verify Supabase project is active and accessible

