# TestFlight Deployment Guide - iOS App

## 📋 Quick Summary

1. **Build for production** → `npm run build && npm run cap:sync`
2. **Open Xcode** → `npm run cap:open:ios`
3. **Archive the app** → Product → Archive
4. **Distribute** → Upload to App Store Connect
5. **Configure in TestFlight** → Add testers

---

## Step 1: Build for Production

```bash
cd /Users/yossivaknin/Desktop/april/code/get-shit-done

# Build Next.js app
npm run build

# Sync with Capacitor (copies web assets to iOS)
npm run cap:sync
```

**What this does:**
- Builds your Next.js app for production
- Copies the built app to the iOS project
- Ensures production server URL (`https://usesitrep.com`) is used

---

## Step 2: Open Xcode

```bash
npm run cap:open:ios
```

Or manually:
```bash
open ios/App/App.xcodeproj
```

---

## Step 3: Configure Signing & Capabilities

1. **Select the project** (top item in navigator)
2. **Select the "App" target**
3. **Go to "Signing & Capabilities" tab**
4. **Verify:**
   - ✅ **Team**: `FF55T96KTV` (your development team)
   - ✅ **Bundle Identifier**: `com.yossivaknin.sitrep`
   - ✅ **Automatically manage signing**: Should be checked
   - ✅ **Signing Certificate**: Should show "Apple Distribution" or "Apple Development"

5. **If you see errors:**
   - Click "Try Again" to let Xcode fix signing automatically
   - Or manually select your distribution certificate

---

## Step 4: Update Version & Build Number

1. **Select the "App" target**
2. **Go to "General" tab**
3. **Update version numbers:**
   - **Version**: `1.0` (or increment, e.g., `1.1` for updates)
   - **Build**: `1` (increment this for each TestFlight upload, e.g., `2`, `3`, etc.)

   **Important**: Each TestFlight upload needs a unique build number that's **higher** than the previous one.

---

## Step 5: Select Generic iOS Device

1. **In the device selector** (top toolbar), select:
   - **"Any iOS Device (arm64)"** or **"Generic iOS Device"**
   - **NOT** a simulator or specific device

---

## Step 6: Archive the App

1. **Menu**: `Product` → `Archive`
   - Or press: `⌘B` (Build) then `Product` → `Archive`
   
2. **Wait for archive to complete** (~2-5 minutes)
   - Xcode will build and create an archive
   - You'll see "Archive succeeded" when done

3. **Organizer window opens automatically**
   - If not, go to: `Window` → `Organizer` (or `⌘⇧9`)

---

## Step 7: Validate the Archive

1. **In Organizer**, select your archive
2. **Click "Validate App"**
3. **Select your team**: `FF55T96KTV`
4. **Click "Next"**
5. **Wait for validation** (~1-2 minutes)
   - ✅ If successful: "Validation successful"
   - ❌ If errors: Fix them before uploading

---

## Step 8: Distribute to App Store Connect

1. **Still in Organizer**, with your archive selected
2. **Click "Distribute App"**
3. **Select distribution method**:
   - Choose **"App Store Connect"**
   - Click **"Next"**
4. **Select distribution options**:
   - Choose **"Upload"** (not "Export")
   - Click **"Next"**
5. **Select distribution certificate**:
   - Choose **"Automatically manage signing"** (recommended)
   - Or manually select your distribution certificate
   - Click **"Next"**
6. **Review and upload**:
   - Review the summary
   - Click **"Upload"**
   - Wait for upload to complete (~5-10 minutes depending on app size)

---

## Step 9: Configure in App Store Connect

1. **Go to [App Store Connect](https://appstoreconnect.apple.com/)**
2. **Sign in** with your Apple Developer account
3. **Navigate to**: `My Apps` → Find your app (or create it if first time)
4. **Go to**: `TestFlight` tab

---

## Step 10: Wait for Processing

1. **Your build will appear** in TestFlight (usually within 10-30 minutes)
2. **Status will show**: "Processing" → "Ready to Submit" → "Ready to Test"
3. **If processing fails**: Check email for details, fix issues, and re-upload

---

## Step 11: Add Test Information (First Time Only)

If this is your first TestFlight build:

1. **Go to**: `App Information` tab
2. **Fill in required fields**:
   - App Name: `SITREP`
   - Primary Language: `English`
   - Bundle ID: `com.yossivaknin.sitrep`
   - SKU: (any unique identifier, e.g., `sitrep-001`)
   - User Access: `Full Access` (for internal testing)

3. **Go to**: `Pricing and Availability`
   - Set to **Free** (or your pricing)

---

## Step 12: Add Internal Testers

1. **Go to**: `TestFlight` tab
2. **Click**: `Internal Testing` (or `External Testing` for external testers)
3. **Add testers**:
   - **Internal**: Up to 100 testers (members of your App Store Connect team)
   - **External**: Up to 10,000 testers (requires App Review)

4. **For Internal Testing**:
   - Click **"+"** to add testers
   - Enter email addresses of team members
   - They'll receive an email invitation

---

## Step 13: Test the Build

1. **Testers receive email** with TestFlight link
2. **They install TestFlight app** from App Store (if not already installed)
3. **They accept invitation** and install your app
4. **Test on real devices** to verify everything works

---

## 🔧 Troubleshooting

### Issue: "No signing certificate found"

**Fix:**
1. Go to Xcode → Preferences → Accounts
2. Select your Apple ID
3. Click "Download Manual Profiles"
4. Or let Xcode automatically manage signing

### Issue: "Bundle identifier is already in use"

**Fix:**
- This means the bundle ID `com.yossivaknin.sitrep` is already registered
- Either use a different bundle ID, or use the existing app in App Store Connect

### Issue: "Invalid bundle identifier"

**Fix:**
- Make sure bundle ID matches exactly in:
  - Xcode project settings
  - App Store Connect
  - Capacitor config (if relevant)

### Issue: Build upload fails

**Fix:**
1. Check internet connection
2. Try uploading again
3. Check App Store Connect status page
4. Verify your Apple Developer account is active

### Issue: "Missing compliance" or "Export compliance"

**Fix:**
1. In App Store Connect, go to your build
2. Answer export compliance questions:
   - Uses encryption? Usually "Yes" (most apps do)
   - Uses standard encryption? Usually "Yes"
3. Submit compliance information

---

## 📱 Testing Checklist

Before marking build as ready:

- [ ] App launches successfully
- [ ] Login works (email/password)
- [ ] Google OAuth works
- [ ] App connects to `https://usesitrep.com`
- [ ] All features work as expected
- [ ] No crashes on launch
- [ ] App icons display correctly
- [ ] Splash screen works

---

## 🔄 Updating the App

For subsequent TestFlight uploads:

1. **Increment build number** (e.g., `1` → `2` → `3`)
2. **Optionally increment version** (e.g., `1.0` → `1.1`)
3. **Rebuild and archive** (repeat Steps 1-8)
4. **Upload new build**
5. **Testers will see update** in TestFlight app

---

## 📝 Important Notes

1. **Build numbers must be unique and incrementing**
   - Each upload needs a higher build number
   - Can't reuse build numbers

2. **Processing time**
   - First build: 30-60 minutes
   - Updates: 10-30 minutes

3. **TestFlight expiration**
   - Builds expire after 90 days
   - You'll need to upload a new build before expiration

4. **App Store submission**
   - TestFlight is separate from App Store submission
   - You can test in TestFlight while preparing for App Store

5. **Production server**
   - Make sure `https://usesitrep.com` is always accessible
   - The app depends on this server for production builds

---

## ✅ Quick Command Reference

```bash
# Step 1: Build
npm run build && npm run cap:sync

# Step 2: Open Xcode
npm run cap:open:ios

# Then in Xcode:
# - Product → Archive
# - Distribute to App Store Connect
# - Upload
```

---

## 🎉 You're Ready!

Once your build is processed and testers are added, you can start testing your app in TestFlight!

**Next Steps**:
- Monitor crash reports in App Store Connect
- Collect feedback from testers
- Fix any issues and upload new builds
- When ready, submit to App Store for public release
