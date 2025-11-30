# Quick Start: Deploy SitRep to GCP

## 🚀 Fast Track (15 minutes)

### 1. GCP Setup (5 min)

```bash
# Install gcloud CLI: https://cloud.google.com/sdk/docs/install

# Login and create project
gcloud auth login
gcloud projects create sitrep-production
gcloud config set project sitrep-production

# Enable APIs
gcloud services enable cloudbuild.googleapis.com run.googleapis.com containerregistry.googleapis.com
```

### 2. Create Service Account (3 min)

```bash
gcloud iam service-accounts create github-actions \
  --display-name="GitHub Actions"

gcloud projects add-iam-policy-binding sitrep-production \
  --member="serviceAccount:github-actions@sitrep-production.iam.gserviceaccount.com" \
  --role="roles/run.admin"

gcloud projects add-iam-policy-binding sitrep-production \
  --member="serviceAccount:github-actions@sitrep-production.iam.gserviceaccount.com" \
  --role="roles/storage.admin"

gcloud iam service-accounts keys create github-actions-key.json \
  --iam-account=github-actions@sitrep-production.iam.gserviceaccount.com
```

### 3. GitHub Secrets (2 min)

Go to: **GitHub Repo** → **Settings** → **Secrets and variables** → **Actions**

Add:
- `GCP_PROJECT_ID`: `sitrep-production`
- `GCP_SA_KEY`: (paste entire contents of `github-actions-key.json`)
- `CLOUD_RUN_ENV_VARS`: `NEXT_PUBLIC_GOOGLE_CLIENT_ID=xxx,GOOGLE_CLIENT_SECRET=yyy,NEXT_PUBLIC_APP_URL=https://yourdomain.com`

### 4. Google OAuth Setup (3 min)

1. [Google Cloud Console](https://console.cloud.google.com/) → **APIs & Services** → **Credentials**
2. **Create OAuth 2.0 Client ID**
3. Add redirect URI: `https://yourdomain.com/api/auth/google/callback`
4. Copy Client ID and Secret → Add to GitHub secrets

### 5. Deploy! (2 min)

```bash
# Option A: Manual first deployment
./deploy.sh

# Option B: Push to main (auto-deploys)
git push origin main
```

### 6. Domain Setup

```bash
# Map domain
gcloud run domain-mappings create \
  --service sitrep \
  --domain yourdomain.com \
  --region us-central1

# Add CNAME record in GoDaddy DNS
# (Use the target provided by GCP)
```

## 📱 PWA Icons Needed

Create these files in `public/`:
- `icon-192.png` (192x192px)
- `icon-512.png` (512x512px)

Use: https://realfavicongenerator.net/ or https://www.pwabuilder.com/imageGenerator

## ✅ Verify Deployment

1. Check Cloud Run service: https://console.cloud.google.com/run
2. Test your domain
3. Test PWA: Open in mobile browser → "Add to Home Screen"
4. Test Google Calendar OAuth

## 🔒 Security Checklist

- [ ] All secrets in GitHub Secrets (never in code)
- [ ] OAuth redirect URI matches production domain
- [ ] HTTPS enabled (automatic with Cloud Run)
- [ ] Environment variables set in Cloud Run

## 💰 Cost Estimate

- **Free Tier**: 2M requests/month, 360K GB-seconds
- **Typical Usage**: $5-20/month
- **Scales to zero** when not in use (saves money)

---

**Full documentation**: See `DEPLOYMENT.md` for detailed instructions.

