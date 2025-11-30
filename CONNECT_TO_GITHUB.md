# Connect Your Local Repository to GitHub

## Step 1: Create a GitHub Repository

1. Go to [github.com](https://github.com) and sign in
2. Click the **"+"** icon in the top right → **"New repository"**
3. Name it: `sitrep` (or whatever you want)
4. **Don't** check "Initialize with README" (you already have code)
5. Click **"Create repository"**

## Step 2: Connect Local Repo to GitHub

After creating the repo, GitHub will show you commands. Use these:

```bash
cd /Users/yossivaknin/Desktop/april/code/get-shit-done

# First, commit all your current changes
git add .
git commit -m "Initial commit - SitRep app ready for deployment"

# Add GitHub as remote (replace YOUR_USERNAME with your GitHub username)
git remote add origin https://github.com/YOUR_USERNAME/sitrep.git

# Push to GitHub
git push -u origin main
```

## That's It!

Your code is now on GitHub! You can:
- View it at: `https://github.com/YOUR_USERNAME/sitrep`
- Deploy to Vercel by importing this repo
- Push future changes with: `git push`

## Quick Reference Commands

```bash
# See what's changed
git status

# Add all changes
git add .

# Commit changes
git commit -m "Your commit message"

# Push to GitHub
git push

# Pull latest from GitHub
git pull
```

