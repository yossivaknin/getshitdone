# SitRep Deployment Guide

This guide covers deploying SitRep to Google Cloud Platform (GCP) with PWA support and a safe CI/CD pipeline.

## Prerequisites

1. **GCP Account** with billing enabled
2. **Domain** from GoDaddy (or any registrar)
3. **GitHub Account** (for CI/CD)
4. **Google Cloud SDK** installed locally (optional, for manual deployments)

## Step 1: GCP Project Setup

### 1.1 Create GCP Project

```bash
# Install gcloud CLI if not already installed
# https://cloud.google.com/sdk/docs/install

# Login to GCP
gcloud auth login

# Create a new project
gcloud projects create sitrep-production --name="SitRep Production"

# Set as active project
gcloud config set project sitrep-production

# Enable required APIs
gcloud services enable cloudbuild.googleapis.com
gcloud services enable run.googleapis.com
gcloud services enable containerregistry.googleapis.com
```

### 1.2 Set up Service Account for CI/CD

```bash
# Create service account
gcloud iam service-accounts create github-actions \
  --display-name="GitHub Actions Service Account"

# Grant necessary permissions
gcloud projects add-iam-policy-binding sitrep-production \
  --member="serviceAccount:github-actions@sitrep-production.iam.gserviceaccount.com" \
  --role="roles/run.admin"

gcloud projects add-iam-policy-binding sitrep-production \
  --member="serviceAccount:github-actions@sitrep-production.iam.gserviceaccount.com" \
  --role="roles/storage.admin"

gcloud projects add-iam-policy-binding sitrep-production \
  --member="serviceAccount:github-actions@sitrep-production.iam.gserviceaccount.com" \
  --role="roles/iam.serviceAccountUser"

# Create and download key
gcloud iam service-accounts keys create github-actions-key.json \
  --iam-account=github-actions@sitrep-production.iam.gserviceaccount.com
```

## Step 2: Environment Variables

### 2.1 Set up Google OAuth

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Navigate to **APIs & Services** > **Credentials**
3. Create OAuth 2.0 Client ID
4. Add authorized redirect URI: `https://your-domain.com/api/auth/google/callback`
5. Copy Client ID and Client Secret

### 2.2 Configure Cloud Run Environment Variables

```bash
# Set environment variables in Cloud Run
gcloud run services update sitrep \
  --region=us-central1 \
  --update-env-vars="NEXT_PUBLIC_GOOGLE_CLIENT_ID=your-client-id,NEXT_PUBLIC_APP_URL=https://your-domain.com,GOOGLE_CLIENT_SECRET=your-secret"
```

Or use Secret Manager (recommended for production):

```bash
# Create secrets
echo -n "your-google-client-id" | gcloud secrets create google-client-id --data-file=-
echo -n "your-google-client-secret" | gcloud secrets create google-client-secret --data-file=-
echo -n "your-supabase-url" | gcloud secrets create supabase-url --data-file=-
echo -n "your-supabase-key" | gcloud secrets create supabase-key --data-file=-

# Grant Cloud Run access
gcloud secrets add-iam-policy-binding google-client-id \
  --member="serviceAccount:PROJECT_NUMBER-compute@developer.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"
```

## Step 3: GitHub Actions Setup

### 3.1 Add Secrets to GitHub

1. Go to your GitHub repository
2. Navigate to **Settings** > **Secrets and variables** > **Actions**
3. Add the following secrets:

   - `GCP_PROJECT_ID`: Your GCP project ID (e.g., `sitrep-production`)
   - `GCP_SA_KEY`: Contents of `github-actions-key.json` (the entire JSON file)
   - `CLOUD_RUN_ENV_VARS`: Comma-separated env vars (e.g., `NEXT_PUBLIC_GOOGLE_CLIENT_ID=xxx,GOOGLE_CLIENT_SECRET=yyy`)
   - `CUSTOM_DOMAIN`: Your domain (e.g., `sitrep.yourdomain.com`)

### 3.2 Push to Main Branch

Once secrets are configured, pushing to `main` will automatically trigger deployment.

## Step 4: Domain Configuration

### 4.1 Map Domain to Cloud Run

```bash
# Create domain mapping
gcloud run domain-mappings create \
  --service sitrep \
  --domain sitrep.yourdomain.com \
  --region us-central1
```

This will provide DNS records to add to GoDaddy.

### 4.2 Configure GoDaddy DNS

1. Log in to GoDaddy
2. Go to **DNS Management** for your domain
3. Add the CNAME record provided by GCP:
   - **Type**: CNAME
   - **Name**: `sitrep` (or `@` for root domain)
   - **Value**: The target provided by GCP (e.g., `ghs.googlehosted.com`)
   - **TTL**: 600

4. Wait for DNS propagation (can take up to 48 hours, usually 1-2 hours)

### 4.3 Verify Domain

```bash
# Check domain mapping status
gcloud run domain-mappings describe sitrep.yourdomain.com \
  --region us-central1
```

## Step 5: PWA Icons

Create PWA icons and place them in `public/`:

```bash
# You'll need to create these icons:
# - public/icon-192.png (192x192px)
# - public/icon-512.png (512x512px)
```

You can use tools like:
- [PWA Asset Generator](https://github.com/onderceylan/pwa-asset-generator)
- [RealFaviconGenerator](https://realfavicongenerator.net/)

## Step 6: First Deployment

### Option A: Manual Deployment (Testing)

```bash
# Build and push image
docker build -t gcr.io/sitrep-production/sitrep:latest .
docker push gcr.io/sitrep-production/sitrep:latest

# Deploy to Cloud Run
gcloud run deploy sitrep \
  --image gcr.io/sitrep-production/sitrep:latest \
  --region us-central1 \
  --platform managed \
  --allow-unauthenticated \
  --port 3000 \
  --memory 1Gi \
  --cpu 1 \
  --set-env-vars "NEXT_PUBLIC_GOOGLE_CLIENT_ID=xxx,GOOGLE_CLIENT_SECRET=yyy"
```

### Option B: Automated Deployment (Production)

1. Push code to `main` branch
2. GitHub Actions will automatically:
   - Build Docker image
   - Push to Container Registry
   - Deploy to Cloud Run

## Step 7: Post-Deployment Checklist

- [ ] Verify app loads at your domain
- [ ] Test Google Calendar OAuth connection
- [ ] Verify PWA installability (check browser dev tools)
- [ ] Test on mobile devices
- [ ] Set up monitoring and alerts
- [ ] Configure backup strategy (if using Supabase)

## Monitoring & Maintenance

### View Logs

```bash
gcloud run services logs read sitrep --region us-central1 --limit 50
```

### Update Environment Variables

```bash
gcloud run services update sitrep \
  --region us-central1 \
  --update-env-vars "NEW_VAR=value"
```

### Rollback to Previous Version

```bash
# List revisions
gcloud run revisions list --service sitrep --region us-central1

# Rollback to specific revision
gcloud run services update-traffic sitrep \
  --region us-central1 \
  --to-revisions REVISION_NAME=100
```

## Cost Optimization

- **Cloud Run** charges per request and compute time
- **Free tier**: 2 million requests/month, 360,000 GB-seconds
- **Estimated cost**: ~$5-20/month for small to medium usage
- Use `--min-instances 0` to scale to zero when not in use

## Security Best Practices

1. **Never commit secrets** to git
2. **Use Secret Manager** for sensitive values
3. **Enable Cloud Armor** for DDoS protection (optional)
4. **Set up Cloud Monitoring** alerts
5. **Regular security updates** for dependencies

## Troubleshooting

### Build Fails
- Check Dockerfile syntax
- Verify all dependencies in package.json
- Check build logs in Cloud Build console

### Deployment Fails
- Verify service account permissions
- Check environment variables are set
- Review Cloud Run logs

### Domain Not Working
- Verify DNS records in GoDaddy
- Check domain mapping status in GCP
- Wait for DNS propagation (up to 48 hours)

## Support

For issues, check:
- [GCP Cloud Run Docs](https://cloud.google.com/run/docs)
- [Next.js Deployment Docs](https://nextjs.org/docs/deployment)
- [PWA Documentation](https://web.dev/progressive-web-apps/)

