# Google OAuth Consent Screen Setup

## If You Don't See "User Type" Option

If you don't see the "External" vs "Internal" option when setting up the OAuth consent screen, here's what to do:

---

## Option 1: Your Account Type is Already Set

If you're using a **personal Google account** (Gmail), you'll automatically be set to "External" mode - you just won't see the option.

**What to do:**
- Just fill in the required fields:
  - **App name**: `SitRep`
  - **User support email**: Your email
  - **Developer contact**: Your email
- Click through all the steps
- You're good to go!

---

## Option 2: You're Using Google Workspace

If you're using a **Google Workspace** (G Suite) account, you might only see "Internal" option or no option at all.

**What to do:**
- If you see "Internal" only:
  - This limits OAuth to users in your organization
  - For a public app, you may need to use a personal Google account instead
- If you want to keep using Workspace:
  - Choose "Internal"
  - Only users in your Google Workspace can use the app
  - This is fine if it's an internal tool

---

## Option 3: App is in Testing Mode

If your app is in "Testing" mode, you'll need to add test users.

**What to do:**
1. After setting up the consent screen, go to **"OAuth consent screen"**
2. Scroll down to **"Test users"**
3. Click **"Add users"**
4. Add your own email (and any other test emails)
5. These users can use the app even in testing mode

**To make it public (later):**
- Go to **"OAuth consent screen"**
- Click **"Publish app"** button
- This makes it available to all Google users (requires verification if you request sensitive scopes)

---

## Quick Steps (No User Type Option)

1. Go to: **APIs & Services** → **OAuth consent screen**
2. Fill in:
   - App name: `SitRep`
   - User support email: Your email
   - Developer contact: Your email
3. Click **"Save and Continue"** through all steps
4. If in Testing mode, add test users
5. Go to **Credentials** → **Create OAuth client ID**

---

## Common Questions

**Q: Do I need to verify my domain?**
- **A:** Not for basic OAuth. Only if you want to publish publicly and request sensitive scopes.

**Q: What if I'm stuck on a step?**
- **A:** You can usually skip optional fields. Only App name, User support email, and Developer contact are required.

**Q: Can I change this later?**
- **A:** Yes! You can edit the consent screen settings anytime.

---

## What Matters for Your App

The important part is:
1. ✅ Consent screen is configured (any way it lets you)
2. ✅ OAuth client ID is created
3. ✅ Redirect URI is set correctly: `https://YOUR_PROJECT_REF.supabase.co/auth/v1/callback`

The "User Type" option is just about who can use your app - for development and testing, either works fine!

