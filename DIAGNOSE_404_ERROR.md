# Diagnose: Calendar API 404 Error When Scheduling

## 🚨 The Problem

Settings page shows "Connected" and token is valid, but scheduling tasks gives a 404 error.

**This almost always means: OAuth credentials and Calendar API are in DIFFERENT Google Cloud projects!**

---

## ✅ Step-by-Step Diagnosis

### Step 1: Get Your OAuth Client ID

1. Open browser console (F12)
2. Go to **Console** tab
3. Type: `localStorage.getItem('google_calendar_token')`
4. Copy the token (long string)
5. Go to: https://www.googleapis.com/oauth2/v1/tokeninfo?access_token=YOUR_TOKEN_HERE
   - Replace `YOUR_TOKEN_HERE` with your actual token
6. Look for `"audience"` - this is your **OAuth Client ID**
7. **Write down this Client ID**

### Step 2: Find Which Project Has This Client ID

1. Go to: https://console.cloud.google.com/apis/credentials
2. Look through the list of OAuth 2.0 Client IDs
3. Find the one that matches the Client ID from Step 1
4. **Note the project name** shown at the top of the page
5. **Write down this project name** (e.g., "sitrep", "getshitdone", etc.)

### Step 3: Check Which Project Has Calendar API Enabled

1. Go to: https://console.cloud.google.com/apis/dashboard
2. Look for "Google Calendar API" in the Enabled APIs list
3. **Check the project name** at the top of the page
4. **Compare with Step 2**

### Step 4: Fix the Mismatch

**If the project names are DIFFERENT:**

1. Select the project from **Step 2** (the one with your OAuth Client ID)
2. Go to: https://console.cloud.google.com/apis/library/calendar-json.googleapis.com
3. **Make sure you're in the correct project** (check the top bar)
4. Click **"Enable"**
5. Wait 1-2 minutes

**OR**

1. Select the project from **Step 3** (the one with Calendar API enabled)
2. Create new OAuth credentials there
3. Update your environment variables
4. Reconnect in Settings

---

## 🔍 Quick Check in Browser Console

After the next deployment, when you try to schedule, check the console for:

```
[CALENDAR] Token audience (Client ID): 938700376037-xxxxx
[CALENDAR] ⚠️ IMPORTANT: Make sure Calendar API is enabled in the SAME project as this Client ID!
```

This will show you exactly which Client ID your token is using.

---

## ✅ Verification Checklist

- [ ] OAuth Client ID is in Project A
- [ ] Calendar API is enabled in Project A (SAME project!)
- [ ] Environment variables point to Project A's credentials
- [ ] Reconnected Google Calendar after fixing
- [ ] Waited 1-2 minutes for propagation

---

## 🆘 Still Getting 404?

If you've verified both are in the same project but still get 404:

1. **Disable and re-enable Calendar API**:
   - Go to Enabled APIs
   - Disable Calendar API
   - Wait 30 seconds
   - Enable it again
   - Wait 2 minutes

2. **Check billing**:
   - Some APIs require billing to be enabled
   - Go to Billing in Google Cloud Console
   - Make sure billing is set up

3. **Try a different browser/incognito**:
   - Clear cache and cookies
   - Reconnect Google Calendar
   - Try scheduling

4. **Check API quotas**:
   - Go to APIs & Services → Quotas
   - Look for Calendar API
   - Make sure there are no restrictions

---

## 📋 What the New Logs Will Show

After the next deployment, when you try to schedule, you'll see in the console:

```
[CALENDAR] Token info: {
  expires_in: 1931,
  scope: 'https://www.googleapis.com/auth/calendar',
  audience: '938700376037-suq18cm...',  ← This is your Client ID
  issued_to: '...',
  user_id: '...'
}
[CALENDAR] Token audience (Client ID): 938700376037-suq18cm...
[CALENDAR] ⚠️ IMPORTANT: Make sure Calendar API is enabled in the SAME project as this Client ID!
```

Use this Client ID to verify it's in the same project as the Calendar API.

---

## ✅ That's It!

The 404 error should be resolved once both OAuth credentials and Calendar API are in the **same Google Cloud project**.



