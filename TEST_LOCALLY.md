# Test Google Calendar API Locally

## ✅ Dev Server Status

Your dev server is running on **http://localhost:3000**

## 🔍 Verify Environment Variables

Your `.env.local` file exists and has:
- ✅ `NEXT_PUBLIC_GOOGLE_CLIENT_ID` - Set
- ✅ `GOOGLE_CLIENT_SECRET` - Set
- ✅ `NEXT_PUBLIC_SUPABASE_URL` - Set
- ✅ `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Set

## ⚠️ Important: Set NEXT_PUBLIC_APP_URL

Make sure `.env.local` has:
```env
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

This ensures the OAuth redirect URI is correct for local testing.

## 🧪 Test Steps

1. **Open**: http://localhost:3000
2. **Login** to your app
3. **Go to Settings**: http://localhost:3000/settings
4. **Click "Connect Google Calendar"**
5. **Complete OAuth flow**
6. **Test connection**

## 🔍 Check OAuth Redirect URI

When you click "Connect", check the console for:
```
[OAuth Debug] Redirect URI: http://localhost:3000/api/auth/google/callback
```

Make sure this matches what's in Google Cloud Console:
1. Go to: https://console.cloud.google.com/apis/credentials
2. Find your OAuth Client ID
3. Check "Authorized redirect URIs"
4. Should include: `http://localhost:3000/api/auth/google/callback`

## 🆘 If OAuth Fails Locally

1. **Check redirect URI** matches in Google Cloud Console
2. **Restart dev server** after changing `.env.local`:
   ```bash
   # Stop: Ctrl+C
   # Restart:
   npm run dev
   ```
3. **Check console logs** for errors
4. **Verify credentials** in `.env.local` match Google Cloud Console

## ✅ Advantages of Testing Locally

- Can see detailed console logs
- Can debug step-by-step
- Can test with different credentials
- Faster iteration

## 📋 Local vs Production

**Local (`localhost:3000`):**
- Uses `.env.local` file
- Redirect URI: `http://localhost:3000/api/auth/google/callback`
- Must be added to Google Cloud Console authorized redirect URIs

**Production (`usesitrep.com`):**
- Uses Vercel environment variables
- Redirect URI: `https://usesitrep.com/api/auth/google/callback`
- Must be added to Google Cloud Console authorized redirect URIs

## 🧪 Test the API Directly

Once connected locally, test in browser console:

```javascript
const token = localStorage.getItem('google_calendar_token');

fetch('https://www.googleapis.com/calendar/v3/users/me/calendarList?maxResults=1', {
  headers: { 'Authorization': `Bearer ${token}` }
})
.then(r => {
  console.log('Status:', r.status);
  return r.text();
})
.then(text => {
  if (r.status === 200) {
    console.log('✅ API works!', JSON.parse(text));
  } else {
    console.log('❌ Error:', text.substring(0, 500));
  }
});
```

This will help diagnose if the issue is with the API itself or with the app code.



