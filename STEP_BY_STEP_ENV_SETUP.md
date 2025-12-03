# Step-by-Step: Set Environment Variables in Vercel

## 🎯 Goal
Set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` in Vercel.

---

## Step 1: Get Your Supabase Credentials (2 minutes)

1. **Open Supabase Dashboard:**
   - Go to: https://app.supabase.com/
   - Log in if needed

2. **Select Your Project:**
   - Click on your project from the list

3. **Go to Settings:**
   - Click **"Settings"** in the left sidebar
   - Click **"API"** under Settings

4. **Copy These Values:**
   
   **a) Project URL:**
   - Look for **"Project URL"** section
   - Copy the URL (looks like: `https://xxxxx.supabase.co`)
   - Example: `https://abcdefghijklmnop.supabase.co`
   - ⚠️ **Important:** No trailing slash!

   **b) API Key (anon/public):**
   - Look for **"Project API keys"** section
   - Find the key labeled **"anon"** or **"public"**
   - Click the **eye icon** to reveal it
   - Copy the entire key (it's a long string)
   - Example: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` (very long)

5. **Keep these values handy** - you'll paste them into Vercel next

---

## Step 2: Add Variables to Vercel (3 minutes)

1. **Open Vercel Dashboard:**
   - Go to: https://vercel.com/dashboard
   - Log in if needed

2. **Select Your Project:**
   - Click on your project (the one for usesitrep.com)

3. **Go to Settings:**
   - Click **"Settings"** tab at the top
   - Click **"Environment Variables"** in the left sidebar

4. **Add First Variable - NEXT_PUBLIC_SUPABASE_URL:**
   
   a) Click **"Add New"** button
   
   b) Fill in:
   - **Key:** `NEXT_PUBLIC_SUPABASE_URL`
   - **Value:** Paste your Supabase Project URL (from Step 1a)
   - **Environments:** Check all three boxes:
     - ✅ Production
     - ✅ Preview  
     - ✅ Development
   
   c) Click **"Save"**

5. **Add Second Variable - NEXT_PUBLIC_SUPABASE_ANON_KEY:**
   
   a) Click **"Add New"** button again
   
   b) Fill in:
   - **Key:** `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **Value:** Paste your Supabase anon key (from Step 1b)
   - **Environments:** Check all three boxes:
     - ✅ Production
     - ✅ Preview
     - ✅ Development
   
   c) Click **"Save"**

6. **Verify Both Are Listed:**
   - You should now see both variables in the list:
     - `NEXT_PUBLIC_SUPABASE_URL`
     - `NEXT_PUBLIC_SUPABASE_ANON_KEY`

---

## Step 3: Redeploy the App (CRITICAL!) (2 minutes)

**⚠️ IMPORTANT:** Variables only apply to NEW deployments. You MUST redeploy!

1. **Go to Deployments Tab:**
   - Click **"Deployments"** tab at the top

2. **Find Latest Deployment:**
   - Look for the most recent deployment (should be at the top)

3. **Redeploy:**
   - Click the **3 dots (⋯)** on the right side of the deployment
   - Click **"Redeploy"**
   - Confirm if asked

4. **Wait for Deployment:**
   - Status will show "Building..." then "Ready"
   - This takes about 2-3 minutes
   - You'll see a green checkmark when done

---

## Step 4: Test (1 minute)

1. **Wait for deployment to complete** (green checkmark)

2. **Visit your site:**
   - Go to: https://usesitrep.com
   - Or refresh if already there

3. **Try to login/signup:**
   - The error should be gone!
   - If you still see an error, it will now tell you exactly what's wrong

---

## ✅ Verification Checklist

After completing all steps, verify:

- [ ] Both variables are listed in Vercel Environment Variables
- [ ] Both variables have ✅ for Production environment
- [ ] App has been redeployed after adding variables
- [ ] Deployment shows green checkmark (Ready)
- [ ] Tried login/signup - no more "Configuration error"

---

## 🆘 Troubleshooting

### "Variables are set but still getting error"
- **Solution:** Did you redeploy? Variables only apply to NEW deployments. Go to Deployments → Redeploy.

### "Can't find Supabase credentials"
- **Solution:** Make sure you're in the correct Supabase project. Go to Settings → API.

### "Variable name is wrong"
- **Solution:** Must be exactly:
  - `NEXT_PUBLIC_SUPABASE_URL` (not `SUPABASE_URL`)
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY` (not `SUPABASE_KEY`)

### "Still getting error after redeploy"
- **Solution:** 
  1. Double-check variable names are exact (case-sensitive)
  2. Make sure values don't have extra spaces
  3. Make sure Production environment is checked
  4. Wait 1-2 minutes after redeploy completes
  5. Clear browser cache and try again

---

## 📸 Visual Guide

**Vercel Environment Variables Page Should Look Like:**

```
Environment Variables
─────────────────────
NEXT_PUBLIC_SUPABASE_URL          [Production] [Preview] [Development]
NEXT_PUBLIC_SUPABASE_ANON_KEY     [Production] [Preview] [Development]
NEXT_PUBLIC_APP_URL               [Production] [Preview] [Development]
```

All should have ✅ for Production!

