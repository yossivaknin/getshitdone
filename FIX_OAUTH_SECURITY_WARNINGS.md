# Fix: OAuth Security Warnings

## 🚨 The Warnings

You're seeing these warnings in Google Cloud Console:
- **Cross-Account Protection**: Not configured
- **Use secure flows**: App not configured to use secure OAuth flows

## ✅ Are These Related to the 404 Error?

**No, these warnings are NOT causing the 404 error.** They're security best practices but won't prevent the Calendar API from working.

**The 404 error is still most likely because:**
- Calendar API is not enabled in the same project as your OAuth credentials
- Or there's a project mismatch

## 🔧 How to Fix the Security Warnings (Optional)

These are security recommendations, not errors. Your app will work without fixing them, but it's good practice to address them.

### Fix 1: Cross-Account Protection

1. Go to: https://console.cloud.google.com/apis/credentials/consent
2. Click on your OAuth consent screen
3. Scroll down to **"Cross-Account Protection"**
4. Click **"Configure"**
5. Follow the setup wizard
6. This helps prevent account hijacking

### Fix 2: Use Secure OAuth Flows

1. Go to: https://console.cloud.google.com/apis/credentials
2. Click on your OAuth 2.0 Client ID
3. Under **"Authorized redirect URIs"**, make sure you're using:
   - `https://usesitrep.com/api/auth/google/callback` (not `http://`)
4. Under **"Authorized JavaScript origins"**, add:
   - `https://usesitrep.com`
5. Make sure **"Application type"** is set to **"Web application"**
6. Save changes

## ⚠️ Important Note

**These security warnings won't fix your 404 error.** The 404 is a separate issue related to the Calendar API not being enabled or being in a different project.

## ✅ Focus on the Real Issue

To fix the 404 error, you need to:

1. **Verify Calendar API is enabled** in the SAME project as your OAuth credentials
2. **Check the project match**:
   - Go to: https://console.cloud.google.com/apis/credentials
   - Note which project your OAuth Client ID is in
   - Go to: https://console.cloud.google.com/apis/dashboard
   - Check if Calendar API is enabled in that SAME project

3. **If they're in different projects**, enable Calendar API in the OAuth project:
   - Select the project with your OAuth Client ID
   - Go to: https://console.cloud.google.com/apis/library/calendar-json.googleapis.com
   - Click "Enable"
   - Wait 1-2 minutes

## 📋 Summary

- **Security warnings**: Not causing the 404, but good to fix for security
- **404 error**: Caused by Calendar API not enabled or project mismatch
- **Priority**: Fix the 404 first, then address security warnings if desired

