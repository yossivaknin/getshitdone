# Where Google Calendar Credentials Come From

## 📍 Environment Variables

The app gets Google Client ID and Secret from **environment variables**:

### Client ID
- **Variable name**: `NEXT_PUBLIC_GOOGLE_CLIENT_ID`
- **Used in**: Client-side code (Settings page, OAuth URL generation)
- **Why `NEXT_PUBLIC_`**: This prefix makes it available in the browser

### Client Secret
- **Variable name**: `GOOGLE_CLIENT_SECRET`
- **Used in**: Server-side code only (OAuth callback, token refresh)
- **Why no `NEXT_PUBLIC_`**: Secret should NEVER be exposed to the browser!

## 🔍 Where They're Used

### 1. Settings Page (Client-Side)
**File**: `src/app/settings/page.tsx`
```typescript
const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '';
```
- Used to generate the OAuth authorization URL
- Available in browser because of `NEXT_PUBLIC_` prefix

### 2. OAuth Callback (Server-Side)
**File**: `src/app/api/auth/google/callback/route.ts`
```typescript
const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
```
- Used to exchange authorization code for access/refresh tokens
- Runs on server only (secret is safe here)

### 3. Token Refresh (Server-Side)
**File**: `src/lib/token-refresh.ts`
```typescript
const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
```
- Used to refresh expired access tokens
- Runs on server only

## 📂 Where They're Stored

### Local Development
**File**: `.env.local` (in project root)
```env
NEXT_PUBLIC_GOOGLE_CLIENT_ID=938700376037-suq18cmtjgnbq9p00a17flv04gdlg4b0.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-xxxxxxxxxxxxx
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

**Important**: 
- `.env.local` is git-ignored (secrets shouldn't be in git)
- Restart dev server after changing `.env.local`

### Production (Vercel)
**Location**: Vercel Dashboard → Settings → Environment Variables

1. Go to: https://vercel.com/dashboard
2. Select your project
3. Go to **Settings** → **Environment Variables**
4. You should see:
   - `NEXT_PUBLIC_GOOGLE_CLIENT_ID`
   - `GOOGLE_CLIENT_SECRET`
   - `NEXT_PUBLIC_APP_URL`

**Important**:
- Variables must be set in Vercel (`.env.local` doesn't work on Vercel)
- Redeploy after adding/changing variables

## 🔍 How to Verify They're Set

### Check in Browser Console
```javascript
// Client ID (available in browser)
console.log('Client ID:', process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID);

// Client Secret (NOT available in browser - this is correct!)
console.log('Client Secret:', process.env.GOOGLE_CLIENT_SECRET); // Will be undefined
```

### Check in Settings Page
The Settings page debug section shows:
- Client ID: ✅ Set or ❌ Not set

### Check Server Logs
In Vercel logs, you should see:
```
[OAuth Callback] Client ID: 938700376037-...
```

## ⚠️ Common Issues

### Issue 1: Client ID Not Set in Vercel
**Symptom**: "Google Client ID not configured" error
**Fix**: Add `NEXT_PUBLIC_GOOGLE_CLIENT_ID` to Vercel environment variables

### Issue 2: Client Secret Not Set in Vercel
**Symptom**: OAuth callback fails with "invalid_client"
**Fix**: Add `GOOGLE_CLIENT_SECRET` to Vercel environment variables

### Issue 3: Wrong Client ID/Secret
**Symptom**: OAuth works but API calls fail
**Fix**: Make sure credentials match the project where Calendar API is enabled

### Issue 4: Variables Not Redeployed
**Symptom**: Added variables but still not working
**Fix**: Redeploy the app after adding environment variables

## 📋 Quick Checklist

- [ ] `NEXT_PUBLIC_GOOGLE_CLIENT_ID` is in Vercel environment variables
- [ ] `GOOGLE_CLIENT_SECRET` is in Vercel environment variables
- [ ] `NEXT_PUBLIC_APP_URL` is set to `https://usesitrep.com`
- [ ] App was redeployed after adding variables
- [ ] Client ID matches the one in Google Cloud Console
- [ ] Client Secret matches the one in Google Cloud Console

## 🔍 Verify Current Values

### In Vercel Dashboard:
1. Go to: https://vercel.com/dashboard
2. Select your project
3. Settings → Environment Variables
4. Check if these are set:
   - `NEXT_PUBLIC_GOOGLE_CLIENT_ID`
   - `GOOGLE_CLIENT_SECRET`
   - `NEXT_PUBLIC_APP_URL`

### In Google Cloud Console:
1. Go to: https://console.cloud.google.com/apis/credentials
2. Find your OAuth 2.0 Client ID
3. Verify the Client ID matches what's in Vercel
4. Click on the Client ID to see the Client Secret
5. Verify the Secret matches what's in Vercel

## ✅ Summary

- **Client ID**: From `NEXT_PUBLIC_GOOGLE_CLIENT_ID` env var (available in browser)
- **Client Secret**: From `GOOGLE_CLIENT_SECRET` env var (server-only)
- **Local**: Stored in `.env.local`
- **Production**: Stored in Vercel environment variables
- **Must match**: The credentials in Google Cloud Console



