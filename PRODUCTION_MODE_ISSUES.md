# Fix: Calendar API 404 After Switching to Production Mode

## 🚨 The Issue

You switched your OAuth consent screen from "Testing" to "Production" a few days ago, and now the Calendar API returns 404.

## 🔍 What Happens When Switching to Production

When you switch to Production mode:
1. **Google requires app verification** for sensitive scopes (like Calendar)
2. **The app goes through a review process** (can take days/weeks)
3. **During review, the app might be restricted** or have limited access
4. **Some APIs might not be accessible** until verification is complete

## ✅ Check Your App Status

1. Go to: https://console.cloud.google.com/apis/credentials/consent
2. Check the **"Publishing status"** at the top
3. Look for:
   - **"In production"** - App is published
   - **"Pending verification"** - App is being reviewed
   - **"Restricted"** - App has restrictions during review

## 🔍 Check for Restrictions

1. In the OAuth consent screen, look for:
   - Any warnings about verification
   - Restrictions on sensitive scopes
   - Messages about "Limited access" or "Restricted"

2. Check if Calendar scope is restricted:
   - Look at the scopes section
   - See if Calendar scope shows any restrictions

## 🆘 Solutions

### Option 1: Switch Back to Testing (Quick Fix)

If you need it working immediately:

1. Go to: https://console.cloud.google.com/apis/credentials/consent
2. Click "Edit App"
3. Change "Publishing status" back to **"Testing"**
4. Add your email as a test user
5. Save changes
6. Wait 5 minutes
7. Reconnect Google Calendar in Settings
8. Test again

**Note:** In Testing mode, only test users can use the app.

### Option 2: Complete Production Verification (Long-term Fix)

If you want to stay in Production:

1. Go to: https://console.cloud.google.com/apis/credentials/consent
2. Check what verification is needed
3. Complete the verification process:
   - Provide app information
   - Submit for review
   - Wait for Google's approval (can take days/weeks)
4. Once verified, the API should work again

### Option 3: Check if Verification is Complete

1. Go to: https://console.cloud.google.com/apis/credentials/consent
2. Check the status
3. If it says "Verified" or "In production" without restrictions:
   - The issue might be something else
   - Try disabling and re-enabling Calendar API
   - Reconnect OAuth

## 🔍 What to Look For

In the OAuth consent screen, check:

- **Publishing status**: What does it say?
- **Scopes section**: Does Calendar scope show any warnings?
- **Verification status**: Is it verified or pending?
- **Restrictions**: Are there any restrictions mentioned?

## 📋 Quick Checklist

- [ ] Check OAuth consent screen publishing status
- [ ] Check if Calendar scope is restricted
- [ ] Check verification status
- [ ] If pending verification: Switch back to Testing OR wait for verification
- [ ] If verified: Try refreshing API and reconnecting OAuth

## ✅ Most Likely Fix

**If your app is in Production but not yet verified:**
- Switch back to Testing mode temporarily
- Add yourself as a test user
- Reconnect OAuth
- Should work immediately

**If your app is verified in Production:**
- Try disabling and re-enabling Calendar API
- Reconnect OAuth
- Check for any quota restrictions

## 🧪 Test After Fix

After switching back to Testing or completing verification:

1. Go to Settings
2. Disconnect Google Calendar
3. Reconnect and complete OAuth flow
4. Test connection
5. Should work!

