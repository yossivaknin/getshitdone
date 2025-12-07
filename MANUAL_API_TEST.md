# Manual Calendar API Test

If everything is configured correctly but you're still getting 404, let's test the API manually.

## 🔍 Step 1: Get Your Access Token

1. Open browser console (F12)
2. Type: `localStorage.getItem('google_calendar_token')`
3. Copy the token (long string starting with `ya29.`)

## 🧪 Step 2: Test Token Info

Open this URL in a new tab (replace `YOUR_TOKEN` with your actual token):
```
https://www.googleapis.com/oauth2/v1/tokeninfo?access_token=YOUR_TOKEN
```

**What to check:**
- Should return JSON with `expires_in`, `scope`, `audience`
- `scope` should include `calendar`
- `audience` is your Client ID

## 🧪 Step 3: Test Calendar List API

Open this URL in a new tab (replace `YOUR_TOKEN`):
```
https://www.googleapis.com/calendar/v3/users/me/calendarList?maxResults=1&access_token=YOUR_TOKEN
```

**Expected results:**
- ✅ **200 OK**: API is working! Returns JSON with calendar list
- ❌ **404**: API not enabled or wrong project
- ❌ **401**: Token expired
- ❌ **403**: Permission denied

## 🧪 Step 4: Test FreeBusy API (The One That's Failing)

This is more complex - you need to make a POST request. Use this in browser console:

```javascript
const token = localStorage.getItem('google_calendar_token');
const now = new Date();
const tomorrow = new Date(now);
tomorrow.setDate(tomorrow.getDate() + 1);

fetch('https://www.googleapis.com/calendar/v3/freebusy', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    timeMin: now.toISOString(),
    timeMax: tomorrow.toISOString(),
    items: [{ id: 'primary' }]
  })
})
.then(r => r.text())
.then(text => {
  console.log('Status:', r.status);
  console.log('Response:', text);
})
.catch(err => console.error('Error:', err));
```

## 🔍 What the Results Mean

### If Calendar List API (Step 3) works but FreeBusy fails:
- Calendar API is enabled and accessible
- Issue might be with FreeBusy endpoint specifically
- Check if there are any API restrictions or quotas

### If both fail with 404:
- Calendar API is NOT enabled in the project
- OR it's enabled in a different project than your OAuth credentials
- Double-check project match

### If you get 401:
- Token expired
- Reconnect in Settings

### If you get 403:
- Token doesn't have calendar scope
- OR API has restrictions
- Reconnect and grant calendar permissions

## 🆘 Still Getting 404?

If you've verified:
- ✅ OAuth Client ID is in Project A
- ✅ Calendar API is enabled in Project A
- ✅ Token has calendar scope
- ✅ Manual test still returns 404

**Try this:**
1. **Disable Calendar API** in Google Cloud Console
2. **Wait 30 seconds**
3. **Enable it again**
4. **Wait 2 minutes**
5. **Test again**

Sometimes Google's API enablement needs a refresh.

## 📋 Share Results

If you run these tests, share:
1. What Step 3 (Calendar List) returns
2. What Step 4 (FreeBusy) returns
3. The exact error messages

This will help pinpoint the exact issue.

