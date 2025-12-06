# Fix: 404 Error Even Though API is Enabled

## 🚨 The Problem

You're getting a 404 error even though:
- ✅ Token exists in localStorage
- ✅ Calendar API is enabled
- ✅ Credentials are configured

**This usually means your OAuth credentials and Calendar API are in DIFFERENT Google Cloud projects!**

---

## ✅ Solution: Verify Same Project

### Step 1: Find Your OAuth Client ID Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Go to **APIs & Services** → **Credentials**
3. Find your OAuth 2.0 Client ID (starts with `938700376037-suq18cm...`)
4. **Note the project name** shown at the top of the page
   - It might say "Project: sitrep" or "Project: getshitdone" or similar
5. **Write down this project name**

### Step 2: Check Which Project Has Calendar API Enabled

1. Still in Google Cloud Console
2. Go to **APIs & Services** → **Enabled APIs**
3. Look for "Google Calendar API" in the list
4. **Check the project name** at the top of the page
5. **Compare with Step 1**

### Step 3: Fix the Mismatch

**If they're different projects, you have two options:**

#### Option A: Enable Calendar API in OAuth Project (Recommended)
1. Select the project that has your OAuth credentials (from Step 1)
2. Go to **APIs & Services** → **Library**
3. Search for "Google Calendar API"
4. Click **"Enable"**
5. Wait 1-2 minutes

#### Option B: Move OAuth Credentials to API Project
1. Select the project that has Calendar API enabled
2. Create new OAuth credentials there
3. Update your environment variables with the new Client ID and Secret
4. Reconnect Google Calendar in Settings

---

## 🔍 How to Verify They Match

### Quick Check:
1. Go to **APIs & Services** → **Credentials**
2. Note the project name at the top
3. Go to **APIs & Services** → **Enabled APIs**
4. Check if the project name matches
5. If different, that's your problem!

---

## 🧪 Test After Fixing

After ensuring both are in the same project:

1. **Wait 1-2 minutes** for changes to propagate
2. **Disconnect and reconnect** Google Calendar in Settings
3. **Try scheduling** a task again
4. The 404 should be gone!

---

## 📋 Complete Checklist

- [ ] OAuth Client ID is in Project A
- [ ] Calendar API is enabled in Project A (SAME project!)
- [ ] Environment variables point to Project A's credentials
- [ ] Reconnected Google Calendar after fixing
- [ ] Waited 1-2 minutes for propagation

---

## ✅ That's It!

The 404 error should be resolved once both OAuth credentials and Calendar API are in the **same Google Cloud project**.

