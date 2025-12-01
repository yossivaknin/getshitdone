# Push to GitHub - Quick Guide

## Option 1: Use Personal Access Token (Recommended)

1. **Create a Personal Access Token:**
   - Go to: https://github.com/settings/tokens
   - Click **"Generate new token"** → **"Generate new token (classic)"**
   - Name it: "SitRep Deployment"
   - Select scopes: Check **"repo"** (gives full repository access)
   - Click **"Generate token"**
   - **Copy the token immediately** (you won't see it again!)

2. **Push using the token:**
   ```bash
   cd /Users/yossivaknin/Desktop/april/code/get-shit-done
   git push -u origin main
   ```
   
   When prompted:
   - **Username**: `getshitdone` (or your GitHub username)
   - **Password**: Paste your Personal Access Token (not your GitHub password!)

## Option 2: Use GitHub CLI (Easier for future)

```bash
# Install GitHub CLI
brew install gh

# Login
gh auth login

# Push
git push -u origin main
```

## Option 3: Manual Push (If above don't work)

You can also push directly from GitHub's web interface or use GitHub Desktop app.

---

**After pushing, your code will be at:** https://github.com/getshitdone/sitrep

