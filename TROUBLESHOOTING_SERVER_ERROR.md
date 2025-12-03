# Troubleshooting Server-Side Error on Login/Signup

If you're getting "Application error: a server-side exception has occurred" when clicking signup or signin, follow these steps:

## 🔍 Step 1: Check Vercel Environment Variables

The most common cause is **missing or incorrect environment variables** in Vercel.

### Check in Vercel Dashboard:

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Select your project
3. Go to **Settings** → **Environment Variables**
4. Verify these variables are set:

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
NEXT_PUBLIC_APP_URL=https://usesitrep.com
```

### Important:
- Variable names are **case-sensitive** - must match exactly
- `NEXT_PUBLIC_` prefix is required for client-accessible variables
- No trailing slashes in URLs
- Values should not have quotes around them

### After updating variables:
1. Go to **Deployments** tab
2. Click **3 dots (⋯)** on latest deployment
3. Click **"Redeploy"**
4. Wait for deployment to complete

---

## 🔍 Step 2: Check Vercel Build Logs

1. Go to Vercel Dashboard → Your Project → **Deployments**
2. Click on the latest deployment
3. Check the **Build Logs** for any errors
4. Look for:
   - Missing environment variables
   - Build failures
   - Runtime errors

---

## 🔍 Step 3: Check Vercel Function Logs

1. Go to Vercel Dashboard → Your Project → **Functions** tab
2. Look for recent function invocations
3. Check for error messages in the logs
4. Common errors:
   - "Missing Supabase environment variables"
   - "Failed to create Supabase client"
   - Authentication errors

---

## 🔍 Step 4: Verify Supabase Configuration

1. Go to [Supabase Dashboard](https://app.supabase.com/)
2. Select your project
3. Go to **Settings** → **API**
4. Verify:
   - **Project URL** matches `NEXT_PUBLIC_SUPABASE_URL`
   - **anon/public key** matches `NEXT_PUBLIC_SUPABASE_ANON_KEY`

---

## 🔍 Step 5: Test Environment Variables Locally

Create a test file to verify your environment variables:

1. Create `.env.local` in your project root:
```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
NEXT_PUBLIC_APP_URL=https://usesitrep.com
```

2. Test locally:
```bash
npm run dev
```

3. Try login/signup locally
4. If it works locally but not in production, the issue is Vercel environment variables

---

## 🛠️ Common Fixes

### Fix 1: Environment Variables Not Set
**Symptom:** Error immediately on form submit
**Solution:** Add all required environment variables in Vercel and redeploy

### Fix 2: Wrong Variable Names
**Symptom:** Error about missing variables
**Solution:** Check exact spelling - must be:
- `NEXT_PUBLIC_SUPABASE_URL` (not `SUPABASE_URL`)
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` (not `SUPABASE_KEY`)

### Fix 3: Variables Not Applied
**Symptom:** Variables are set but still getting errors
**Solution:** 
- Make sure variables are enabled for **Production** environment
- **Redeploy** the app after adding variables
- Clear Vercel cache if needed

### Fix 4: Supabase URL Format
**Symptom:** Connection errors
**Solution:** 
- URL should be: `https://xxxxx.supabase.co` (not `https://xxxxx.supabase.co/`)
- No trailing slash
- Must start with `https://`

---

## 📋 Quick Checklist

- [ ] All environment variables are set in Vercel
- [ ] Variable names are correct (case-sensitive)
- [ ] Variables are enabled for Production environment
- [ ] App has been redeployed after adding variables
- [ ] Supabase project URL and key are correct
- [ ] No trailing slashes in URLs
- [ ] Checked Vercel function logs for specific errors

---

## 🆘 Still Not Working?

If you've checked everything above and it's still not working:

1. **Check Vercel Function Logs** for the exact error message
2. **Share the error** from Vercel logs (not just the browser error)
3. **Verify** your Supabase project is active and accessible
4. **Test** with a fresh deployment

The error message in Vercel logs will tell us exactly what's failing!

