# Google Calendar Scope - Approval Required

## ✅ Good News: Scope is Configured!

Your OAuth consent screen shows the `calendar` scope is configured:
- **Scope:** `https://www.googleapis.com/auth/calendar`
- **Status:** Approval required (sensitive scope)

## 🎯 Two Ways to Use It

### Option 1: Testing Mode (Works Immediately) ⚡

If your app is in **"Testing"** mode, you can use the calendar scope **right now** without Google's approval:

1. **Add yourself as a test user:**
   - Go to: [OAuth Consent Screen](https://console.cloud.google.com/apis/credentials/consent)
   - Scroll to **"Test users"** section
   - Click **"Add users"**
   - Add your email address
   - Click **"Add"**

2. **Test the app:**
   - Log out of your app
   - Log back in with Google (using the test user email)
   - You should see the calendar permission request
   - Grant it, and it will work!

**Limitation:** Only test users you add can use the app. This is fine for development/testing.

---

### Option 2: Submit for Approval (For Production) 📋

If you want to publish your app publicly, you need to:

1. **Provide justification:**
   - In the "How will the scopes be used?" field, enter something like:
   
   ```
   This application helps users manage their tasks by automatically scheduling 
   them in Google Calendar. The calendar scope is required to:
   - Create calendar events for scheduled tasks
   - Check for busy time slots to avoid conflicts
   - Sync task due dates with calendar events
   
   Users explicitly opt-in to calendar integration in the app settings.
   ```

2. **Submit for verification:**
   - Scroll to the bottom of the OAuth consent screen
   - Click **"Submit for verification"**
   - Google will review (can take days/weeks)
   - You'll get an email when approved

3. **While waiting:**
   - Keep using Testing mode with test users
   - The app will work fine for you and your test users

---

## 🔍 How to Check Your App's Mode

1. Go to: [OAuth Consent Screen](https://console.cloud.google.com/apis/credentials/consent)
2. Look at the top - it will say either:
   - **"Testing"** - You can use it with test users now
   - **"In production"** - Needs approval for sensitive scopes

---

## ✅ Verify It's Working

After adding yourself as a test user and re-authenticating:

1. **Check the token scope:**
   - Open browser console (F12)
   - Run: `localStorage.getItem('google_calendar_token')`
   - Copy the token
   - Go to: http://localhost:3000/diagnose-calendar
   - Click "Run Diagnostics"
   - Check if "Has Calendar Scope" shows ✅ Yes

2. **Test the Calendar API:**
   - Go to: http://localhost:3000/debug-slots
   - Enter a date and click "Check Available Slots"
   - It should work without 404 errors!

---

## 🚨 Common Issues

### "Approval required" but app is in Testing mode
- **Solution:** Add yourself as a test user (see Option 1 above)

### Token doesn't have calendar scope
- **Solution:** 
  1. Log out completely
  2. Clear browser cache/localStorage
  3. Log back in with Google
  4. Make sure you grant calendar permissions when prompted

### Still getting 404 errors
- **Solution:** 
  1. Make sure you're a test user (if in Testing mode)
  2. Make sure Calendar API is enabled in the same project
  3. Run the diagnostic tool: http://localhost:3000/diagnose-calendar

---

## 📝 Quick Checklist

- [ ] Scope is configured in OAuth consent screen ✅ (You have this!)
- [ ] App is in Testing mode OR submitted for approval
- [ ] You're added as a test user (if in Testing mode)
- [ ] Calendar API is enabled in the same project
- [ ] Code requests calendar scope (already done ✅)
- [ ] You've re-authenticated after adding the scope

---

## 🎯 Next Steps

1. **Check your app's mode** (Testing vs Production)
2. **If Testing:** Add yourself as a test user
3. **Re-authenticate** to get a new token with calendar scope
4. **Test** using the diagnostic tool
5. **If it works:** You're all set! 🎉

If you're still having issues after this, the diagnostic tool will show exactly what's wrong.


