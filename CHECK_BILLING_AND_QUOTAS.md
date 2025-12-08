Go to: https://console.cloud.google.com/apis/credentials/consent
# Check Billing and Quotas for Calendar API 404

## ✅ Your Configuration is Correct!

You've verified:
- ✅ OAuth Client ID and Calendar API are in the same project
- ✅ Calendar API is enabled
- ✅ Everything is properly linked

But you're still getting 404. This suggests a **billing or quota issue**.

## 🔍 Step 1: Check Billing

Some Google APIs require billing to be enabled, even on the free tier:

1. Go to: https://console.cloud.google.com/billing
2. Check if billing is enabled for project `fast-asset-287619`
3. If not enabled:
   - Click "Link a billing account"
   - You can use a free tier (no charges for basic usage)
   - This is required for some APIs even if you stay within free limits

## 🔍 Step 2: Check API Quotas

1. Go to: https://console.cloud.google.com/apis/api/calendar-json.googleapis.com/quotas
2. Make sure you're in project `fast-asset-287619`
3. Check for any restrictions or limits
4. Look for any errors or warnings

## 🔍 Step 3: Check Test Logs

When you click "Test Connection", check the browser console for:

```
[TEST] Step 2: Testing Calendar API access with simple call...
[TEST] Calendar list API response: { status: ..., statusText: ..., ok: ... }
```

**What to look for:**
- If Calendar List API (Step 2) also returns 404 → General API access issue (billing/quota)
- If Calendar List API works but FreeBusy fails → FreeBusy-specific issue

## 🔍 Step 4: Wait Longer

Sometimes API enablement takes 5-10 minutes to fully propagate:

1. Wait 5-10 minutes after enabling
2. Try the test again
3. If still 404, check billing

## 🔍 Step 5: Try Manual Test

Test the API directly in browser console:

```javascript
const token = localStorage.getItem('google_calendar_token');

// Test Calendar List API (simpler endpoint)
fetch('https://www.googleapis.com/calendar/v3/users/me/calendarList?maxResults=1', {
  headers: { 'Authorization': `Bearer ${token}` }
})
.then(r => {
  console.log('Status:', r.status);
  return r.text();
})
.then(text => {
  console.log('Response:', text.substring(0, 500));
});
```

**Expected:**
- ✅ **200**: API is working
- ❌ **404**: Billing/quota issue or API not accessible
- ❌ **401**: Token expired
- ❌ **403**: Permission denied

## 🆘 Most Likely Causes

Since your project is correctly configured, the 404 is likely due to:

1. **Billing not enabled** (most common)
   - Even free tier requires billing account to be linked
   - Go to: https://console.cloud.google.com/billing

2. **API needs more time**
   - Wait 5-10 minutes after enabling
   - Try again

3. **Quota restrictions**
   - Check: https://console.cloud.google.com/apis/api/calendar-json.googleapis.com/quotas

## ✅ Quick Fix Checklist

- [ ] Billing is enabled for project `fast-asset-287619`
- [ ] Waited 5-10 minutes after enabling API
- [ ] Checked quotas for restrictions
- [ ] Tested Calendar List API manually
- [ ] Checked browser console for detailed error logs

## 📋 Next Steps

1. **Enable billing** (if not already)
2. **Wait 5-10 minutes**
3. **Test again**
4. **Check console logs** for which specific API call is failing

The test function will show you if it's a general API issue (Calendar List fails) or FreeBusy-specific (Calendar List works, FreeBusy fails).

