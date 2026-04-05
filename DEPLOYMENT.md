# Synchra Deployment Guide - Week 1

This guide walks you through deploying Synchra to GCP with the $300 free credit.

## Prerequisites

1. **GCP Account** with $300 free credits activated
2. **gcloud CLI** installed ([Download](https://cloud.google.com/sdk/docs/install))
3. **Docker** installed locally
4. **Vercel Account** (free tier)
5. **Firebase Project** created
6. **Supabase Account** (free tier)
7. **Cloudflare Account** (free tier)

## Step-by-Step Deployment

### 1. GCP Infrastructure Setup

Run the setup script (Linux/Mac):
```bash
chmod +x scripts/gcp-setup.sh
./scripts/gcp-setup.sh
```

For Windows (PowerShell):
```powershell
# Set your project configuration
$PROJECT_ID = "synchra-prod"
$REGION = "us-central1"

# Create project
gcloud projects create $PROJECT_ID --name="Synchra Production"
gcloud config set project $PROJECT_ID

# Enable billing (do this in GCP Console first!)
# Visit: https://console.cloud.google.com/billing/linkedaccount?project=$PROJECT_ID

# Enable required APIs
gcloud services enable run.googleapis.com cloudbuild.googleapis.com artifactregistry.googleapis.com storage.googleapis.com secretmanager.googleapis.com

# Create GCS bucket
gcloud storage buckets create gs://synchra-videos --location=$REGION --uniform-bucket-level-access

# Create Artifact Registry
gcloud artifacts repositories create app --repository-format=docker --location=$REGION

# Configure Docker auth
gcloud auth configure-docker us-central1-docker.pkg.dev
```

### 2. Firebase Setup

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Create new project or select existing one
3. **Enable Authentication**:
   - Go to Authentication → Sign-in method
   - Enable **Google** provider
   - Enable **Anonymous** provider
4. **Generate Admin SDK Key**:
   - Go to Project Settings → Service Accounts
   - Click "Generate new private key"
   - Save the JSON file securely
5. **Store in Secret Manager**:
   ```bash
   gcloud secrets create firebase-admin-key --data-file=path/to/key.json
   ```
6. **⚠️ IMPORTANT**: Delete the old exposed key immediately!
7. **Get Firebase Config** (for frontend):
   - Go to Project Settings → General
   - Under "Your apps" → Web app → Copy config object

### 3. Supabase Setup (Phase 1 - Free Tier)

1. Go to [Supabase](https://supabase.com/)
2. Create new project
3. Note down:
   - `SUPABASE_URL`
   - `SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_KEY`
4. Run database migrations (see `backend/migrations/`)

### 4. Backend Deployment

Create Cloud Build trigger:
```bash
# Connect GitHub repo
gcloud beta builds triggers create github \
  --name=synchra-deploy \
  --repo-name=Synchra \
  --repo-owner=Pankajjakhar04 \
  --branch-pattern=^main$ \
  --build-config=cloudbuild.yaml
```

Or manually deploy:
```bash
# Build and push backend
cd backend
gcloud builds submit \
  --tag us-central1-docker.pkg.dev/synchra-prod/app/backend:latest

# Deploy to Cloud Run
gcloud run deploy synchra-backend \
  --image us-central1-docker.pkg.dev/synchra-prod/app/backend:latest \
  --region us-central1 \
  --platform managed \
  --allow-unauthenticated \
  --min-instances 0 \
  --max-instances 10 \
  --memory 512Mi \
  --set-secrets FIREBASE_SERVICE_ACCOUNT=firebase-admin-key:latest
```

Get the backend URL:
```bash
gcloud run services describe synchra-backend --region us-central1 --format 'value(status.url)'
```

### 5. Frontend Deployment (Vercel)

1. **Install Vercel CLI**:
   ```bash
   npm install -g vercel
   ```

2. **Login to Vercel**:
   ```bash
   vercel login
   ```

3. **Deploy**:
   ```bash
   cd frontend
   vercel --prod
   ```

4. **Set Environment Variables** (in Vercel Dashboard):
   - `VITE_API_URL`: Your Cloud Run backend URL
   - `VITE_SOCKET_URL`: Same as API URL
   - `VITE_FIREBASE_API_KEY`: From Firebase config
   - `VITE_FIREBASE_AUTH_DOMAIN`: From Firebase config
   - `VITE_FIREBASE_PROJECT_ID`: From Firebase config
   - `VITE_FIREBASE_STORAGE_BUCKET`: From Firebase config
   - `VITE_FIREBASE_MESSAGING_SENDER_ID`: From Firebase config
   - `VITE_FIREBASE_APP_ID`: From Firebase config

5. **Redeploy** to pick up env vars:
   ```bash
   vercel --prod
   ```

### 6. Cloudflare Setup

1. **Add your domain** to Cloudflare
2. **DNS Records**:
   ```
   Type  Name       Content                        Proxy
   CNAME api        <your-cloud-run-url>           ✅ Proxied
   CNAME @          <your-vercel-url>              ✅ Proxied
   CNAME www        <your-vercel-url>              ✅ Proxied
   ```
3. **SSL/TLS**: Set to "Full (strict)"
4. **Page Rules** for GCS bucket (optional):
   - URL: `yourdomain.com/videos/*`
   - Cache Level: Cache Everything
   - Edge Cache TTL: 1 month

### 7. Environment Variables

Create `.env` files:

**backend/.env**:
```env
NODE_ENV=production
PORT=8080

# Firebase
FIREBASE_SERVICE_ACCOUNT=<loaded from Secret Manager>

# Supabase
SUPABASE_URL=<your-supabase-url>
SUPABASE_SERVICE_KEY=<your-service-key>

# Redis
REDIS_URL=<cloud-run-redis-url>
REDIS_PASSWORD=<generate-strong-password>

# GCS
GCS_BUCKET=synchra-videos
```

**frontend/.env.production**:
```env
VITE_API_URL=https://api.yourdomain.com
VITE_SOCKET_URL=https://api.yourdomain.com

VITE_FIREBASE_API_KEY=<from-firebase-config>
VITE_FIREBASE_AUTH_DOMAIN=<from-firebase-config>
VITE_FIREBASE_PROJECT_ID=<from-firebase-config>
VITE_FIREBASE_STORAGE_BUCKET=<from-firebase-config>
VITE_FIREBASE_MESSAGING_SENDER_ID=<from-firebase-config>
VITE_FIREBASE_APP_ID=<from-firebase-config>
```

### 8. Monitoring & Budget Alerts

1. **Set up budget alerts**:
   - Go to [GCP Billing](https://console.cloud.google.com/billing)
   - Create budget
   - Set thresholds: $10, $20, $50
   - Add email notifications

2. **Enable Cloud Monitoring** (free tier):
   ```bash
   gcloud services enable monitoring.googleapis.com
   ```

3. **Check costs weekly**:
   ```bash
   gcloud billing accounts list
   gcloud billing projects link synchra-prod --billing-account=<BILLING_ACCOUNT_ID>
   ```

## Testing Your Deployment

1. **Backend health check**:
   ```bash
   curl https://your-backend-url/health
   ```

2. **Frontend**:
   - Visit your Vercel URL
   - Create a test room
   - Verify Socket.IO connection in browser console

3. **End-to-end**:
   - Sign in with Google
   - Create room
   - Share link and join from another browser
   - Test play/pause sync

## Cost Monitoring

Target Week 1 spend: **< $20**

Check current spend:
```bash
gcloud billing accounts list
```

View detailed breakdown:
- Visit: https://console.cloud.google.com/billing/01XXXX-XXXX-XXXX/reports

## Troubleshooting

### Backend won't deploy
```bash
# Check Cloud Build logs
gcloud builds list --limit=5
gcloud builds log <BUILD_ID>
```

### Frontend can't connect
- Check CORS settings in backend
- Verify environment variables in Vercel
- Check browser console for errors

### Redis connection fails
- Verify Redis Cloud Run service is running
- Check VPC connector (if using)
- Ensure REDIS_URL is correct

## Next Steps

After successful deployment:
- ✅ Week 2: Implement core sync algorithms
- ✅ Week 3: Add WebRTC for video chat
- ✅ Week 4: Polish UI and launch MVP

---

📊 **Cost Dashboard**: https://console.cloud.google.com/billing/synchra-prod/reports  
🔧 **Cloud Run Services**: https://console.cloud.google.com/run?project=synchra-prod  
🎯 **Target**: Stay under $300 for 12+ months of operation
