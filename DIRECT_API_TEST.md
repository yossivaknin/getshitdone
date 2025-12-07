# Direct Calendar API Test

Since your project is correctly configured but you're still getting 404, let's test the API directly.

## 🧪 Step 1: Get Your Token

1. Open browser console (F12)
2. Type: `localStorage.getItem('google_calendar_token')`
3. Copy the token (starts with `ya29.`)

## 🧪 Step 2: Test Calendar List API Directly

Paste this in your browser console (replace `YOUR_TOKEN` with your actual token):

```javascript
const token = localStorage.getItem('google_calendar_token');

fetch('https://www.googleapis.com/calendar/v3/users/me/calendarList?maxResults=1', {
  headers: {
    'Authorization': `Bearer ${token}`,
  },
})
.then(r => {
  console.log('Status:', r.status);
  console.log('Status Text:', r.statusText);
  console.log('OK:', r.ok);
  return r.text();
})
.then(text => {
  console.log('Response (first 1000 chars):', text.substring(0, 1000));
  if (text.includes('<!DOCTYPE html>')) {
    console.error('❌ Got HTML 404 page - This means billing is likely not enabled');
  } else {
    try {
      const json = JSON.parse(text);
      console.log('✅ Got JSON response:', json);
    } catch (e) {
      console.log('Response is not JSON:', text);
    }
  }
})
.catch(err => console.error('Error:', err));
```

## 🔍 What to Look For

### If you get 200 OK:
- ✅ API is working! The issue might be in the code
- Check the JSON response

### If you get 404 with HTML:
- ❌ **Billing is not enabled**
- Go to: https://console.cloud.google.com/billing
- Link a billing account (free tier is fine)
- Wait 2-5 minutes
- Try again

### If you get 401:
- Token expired
- Reconnect in Settings

### If you get 403:
- Permission denied
- Check quotas or API restrictions

## 🧪 Step 3: Test FreeBusy API Directly

If Calendar List works, test FreeBusy:

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
.then(r => {
  console.log('FreeBusy Status:', r.status);
  return r.text();
})
.then(text => {
  console.log('FreeBusy Response:', text.substring(0, 1000));
})
.catch(err => console.error('FreeBusy Error:', err));
```

## 📋 Most Likely Issue: Billing

Since your project is correctly configured, the HTML 404 almost certainly means:

**Billing is not enabled for project `fast-asset-287619`**

### To Fix:

1. Go to: https://console.cloud.google.com/billing
2. Make sure you're in project `fast-asset-287619`
3. If no billing account:
   - Click "Link a billing account"
   - Create one (free tier is fine - no charges for basic usage)
4. Wait 2-5 minutes
5. Test again

## ✅ After Enabling Billing

1. Wait 2-5 minutes
2. Run the direct test above
3. Should get 200 OK with JSON response
4. Then "Test Connection" in Settings should work

