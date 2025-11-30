# Google OAuth Setup Instructions

## Issue: "Access blocked: Schedular has not completed the Google verification process"

This happens because Google requires apps to be verified before they can be used by all users. However, for development, you can add test users.

## Solution: Add Test Users (For Development)

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Navigate to **APIs & Services** → **OAuth consent screen**
3. Scroll down to the **Test users** section
4. Click **+ ADD USERS**
5. Add your Google account email address (the one you want to use for testing)
6. Click **ADD**

## Important Notes:

- Test users can use the app without verification
- You can add up to 100 test users
- For production, you'll need to complete the verification process
- Make sure you're logged into Google with the email you added as a test user

## After Adding Test User:

1. Restart your dev server
2. Go to `/settings` in your app
3. Click "Connect Google Calendar"
4. You should now be able to authorize the app

## Alternative: Use OAuth Playground (For Quick Testing)

If you want to test the Calendar API quickly without setting up test users, you can use the OAuth 2.0 Playground, but for the app integration, adding test users is the recommended approach.

