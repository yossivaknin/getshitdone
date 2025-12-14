# Fix: Environment Variables Not Working

## 🚨 The Problem

You have `NEXT_PUBLIC_GOOGLE_CLIENT_ID` in `.env.local` but still getting the error.

---

## ✅ Solution: Check Where You're Running

### If Running Locally (localhost:3000)

1. **Stop your dev server** (Ctrl+C or Cmd+C)
2. **Restart it:**
   ```bash
   npm run dev
   ```
3. **Important:** Next.js only reads `.env.local` when the server starts!

### If Running on Production (usesitrep.com)

`.env.local` **does NOT work on Vercel!** You need to add variables in Vercel Dashboard:

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Select your project
3. Go to **Settings** → **Environment Variables**
4. Add:
   - **Name**: `NEXT_PUBLIC_GOOGLE_CLIENT_ID`
   - **Value**: Your Client ID
   - **Environment**: Production, Preview, Development (select all)
5. Add:
   - **Name**: `GOOGLE_CLIENT_SECRET`
   - **Value**: Your Client Secret
   - **Environment**: Production, Preview, Development (select all)
6. Click **"Save"**
7. **Redeploy** your app:
   - Go to **Deployments** tab
   - Click the **"..."** menu on the latest deployment
   - Click **"Redeploy"**

---

## 🔍 Verify Environment Variables

### Check if Variable is Available

Add this temporarily to your `settings/page.tsx` to debug:

```typescript
console.log('Client ID:', process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID);
```

**Expected:**
- Local: Should show your Client ID (after restart)
- Production: Should show your Client ID (after redeploy)

**If it shows `undefined`:**
- Local: Restart dev server
- Production: Add to Vercel and redeploy

---

## 🔍 Common Issues

### Issue 1: Variable Not Prefixed with `NEXT_PUBLIC_`

**Wrong:**
```env
GOOGLE_CLIENT_ID=xxx  # Won't work in client components!
```

**Correct:**
```env
NEXT_PUBLIC_GOOGLE_CLIENT_ID=xxx  # Works in client components
```

### Issue 2: Server Not Restarted (Local)

- `.env.local` is only read when Next.js starts
- **Solution:** Stop and restart `npm run dev`

### Issue 3: Not in Vercel (Production)

- `.env.local` is ignored on Vercel
- **Solution:** Add variables in Vercel Dashboard

### Issue 4: Wrong File Name

**Correct files:**
- `.env.local` (for local development)
- `.env` (also works, but `.env.local` takes precedence)

**Wrong:**
- `.env.example` (just a template)
- `env.local` (missing the dot)

---

## ✅ Quick Checklist

### For Local Development:
- [ ] Variables in `.env.local` (not `.env`)
- [ ] Variables prefixed with `NEXT_PUBLIC_` for client-side
- [ ] Dev server restarted after adding variables
- [ ] File is in project root (same level as `package.json`)

### For Production (Vercel):
- [ ] Variables added in Vercel Dashboard
- [ ] Variables prefixed with `NEXT_PUBLIC_` for client-side
- [ ] App redeployed after adding variables
- [ ] Checked that variables are in "Production" environment

---

## 🔍 Debug Steps

1. **Check if variable exists:**
   ```typescript
   console.log(process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID);
   ```

2. **Check file location:**
   - `.env.local` should be in project root
   - Same directory as `package.json`

3. **Check file format:**
   ```env
   NEXT_PUBLIC_GOOGLE_CLIENT_ID=your-client-id-here
   GOOGLE_CLIENT_SECRET=your-secret-here
   ```
   - No spaces around `=`
   - No quotes needed
   - No trailing semicolons

4. **For Vercel, check logs:**
   - Go to Vercel Dashboard → Your Project → Deployments
   - Click on a deployment → "View Function Logs"
   - Look for any environment variable errors

---

## 🆘 Still Not Working?

1. **Verify the variable name is exact:**
   - `NEXT_PUBLIC_GOOGLE_CLIENT_ID` (case-sensitive!)
   - Not `NEXT_PUBLIC_GOOGLE_CLIENT` or `GOOGLE_CLIENT_ID`

2. **Check browser console:**
   - Open DevTools (F12)
   - Look for the console.log output
   - If it shows `undefined`, the variable isn't being read

3. **Try hardcoding temporarily** (to test if it's an env var issue):
   ```typescript
   const clientId = 'your-actual-client-id-here' || process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '';
   ```
   If this works, it's definitely an environment variable issue.

---

**Most likely fix:** If you're on production, add the variables in Vercel and redeploy!




