# Step-by-Step: Enable Google Calendar API

## 🚨 You're Getting This Error Because:

The Google Calendar API is **not enabled** in your Google Cloud project. This is a **required step** that's separate from setting up OAuth credentials.

---

## ✅ Complete Step-by-Step Guide

### Step 1: Go to Google Cloud Console

1. Open: https://console.cloud.google.com/
2. **Make sure you're logged in** with the same Google account that created the OAuth credentials

### Step 2: Select the Correct Project

1. Look at the **top bar** - you'll see a project selector dropdown
2. Click on it and **select the project** that has your OAuth Client ID
   - Your Client ID starts with: `938700376037-suq18cm...`
   - The project name might be something like "SitRep" or "getshitdone" or similar
3. **IMPORTANT**: Make sure you're in the **same project** as your OAuth credentials!

### Step 3: Enable Calendar API

**Option A: Direct Link (Easiest)**
1. Click this link: https://console.cloud.google.com/apis/library/calendar-json.googleapis.com
2. Make sure the correct project is selected (check the top bar)
3. Click the big blue **"Enable"** button
4. Wait 10-30 seconds

**Option B: Manual Navigation**
1. In Google Cloud Console, go to **"APIs & Services"** → **"Library"** (left sidebar)
2. In the search box, type: **"Google Calendar API"**
3. Click on **"Google Calendar API"** (the one by Google)
4. Click the **"Enable"** button
5. Wait 10-30 seconds

### Step 4: Verify API is Enabled

1. Go to **"APIs & Services"** → **"Enabled APIs"** (left sidebar)
2. Look for **"Google Calendar API"** in the list
3. It should show:
   - ✅ **Status**: "Enabled"
   - ✅ **Name**: "Google Calendar API"
   - ✅ A green checkmark or "Enabled" badge

### Step 5: Wait and Test

1. **Wait 1-2 minutes** after enabling (API enablement needs to propagate)
2. Go back to your app
3. Try scheduling a task again
4. The 404 error should be gone!

---

## 🔍 Troubleshooting

### "I don't see the Enable button"

- Make sure you're in the **correct project** (check the project selector at the top)
- Make sure you have **Editor** or **Owner** permissions on the project
- Try refreshing the page

### "I enabled it but still getting 404"

1. **Wait longer** - Sometimes it takes 2-5 minutes to propagate
2. **Verify it's enabled**:
   - Go to "APIs & Services" → "Enabled APIs"
   - Confirm "Google Calendar API" is in the list
3. **Check the project**:
   - Make sure your OAuth Client ID is from the same project
   - Go to "APIs & Services" → "Credentials"
   - Check which project your OAuth client is in
4. **Try disconnecting and reconnecting**:
   - Go to Settings in your app
   - Disconnect Google Calendar
   - Reconnect it
   - Try scheduling again

### "I'm not sure which project to use"

1. Go to **"APIs & Services"** → **"Credentials"**
2. Find your OAuth 2.0 Client ID (the one starting with `938700376037-...`)
3. Note which **project** it's in (shown at the top of the page)
4. Make sure you enable the Calendar API in **that same project**

---

## ✅ Verification Checklist

After enabling, verify:

- [ ] Calendar API shows in "Enabled APIs" list
- [ ] Status shows "Enabled" (not "Enabling" or "Disabled")
- [ ] You're in the same project as your OAuth credentials
- [ ] You waited 1-2 minutes after enabling
- [ ] You tried disconnecting and reconnecting in Settings

---

## 🆘 Still Not Working?

If you've enabled the API, waited, and verified everything, but still get 404:

1. **Check API quotas**:
   - Go to "APIs & Services" → "Quotas"
   - Look for "Google Calendar API"
   - Make sure there are no restrictions

2. **Check billing**:
   - Some APIs require billing to be enabled
   - Go to "Billing" in Google Cloud Console
   - Make sure billing is set up (even if you're on free tier)

3. **Try a different approach**:
   - Disable the API
   - Wait 30 seconds
   - Enable it again
   - Wait 2 minutes
   - Try again

4. **Check the exact error**:
   - Open browser console (F12)
   - Look for `[CALENDAR]` logs
   - Share the exact error message

---

## 📞 Need More Help?

If none of this works, please share:
1. Screenshot of "Enabled APIs" page showing Calendar API
2. Screenshot of your OAuth credentials page
3. The exact error message from browser console

