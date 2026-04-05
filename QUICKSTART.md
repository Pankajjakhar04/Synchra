# Synchra - Quick Start Commands

## Windows PowerShell Commands

### 1. GCP Setup
```powershell
# Login to GCP
gcloud auth login

# Set project variables
$PROJECT_ID = "synchra-prod"
$REGION = "us-central1"

# Create project
gcloud projects create $PROJECT_ID --name="Synchra Production"
gcloud config set project $PROJECT_ID

# Enable required APIs
gcloud services enable run.googleapis.com, cloudbuild.googleapis.com, artifactregistry.googleapis.com, storage.googleapis.com, secretmanager.googleapis.com

# Create GCS bucket
gcloud storage buckets create gs://synchra-videos --location=$REGION --uniform-bucket-level-access

# Create Artifact Registry
gcloud artifacts repositories create app --repository-format=docker --location=$REGION --description="Synchra Docker images"

# Configure Docker authentication
gcloud auth configure-docker us-central1-docker.pkg.dev
```

### 2. Store Firebase Credentials
```powershell
# After downloading Firebase Admin SDK JSON
gcloud secrets create firebase-admin-key --data-file="path\to\your\firebase-key.json"

# Grant Cloud Run access to secret
$PROJECT_NUMBER = (gcloud projects describe $PROJECT_ID --format="value(projectNumber)")
gcloud secrets add-iam-policy-binding firebase-admin-key --member="serviceAccount:$PROJECT_NUMBER-compute@developer.gserviceaccount.com" --role="roles/secretmanager.secretAccessor"
```

### 3. Manual Backend Build & Deploy
```powershell
cd backend

# Build Docker image
gcloud builds submit --tag us-central1-docker.pkg.dev/synchra-prod/app/backend:latest

# Deploy to Cloud Run
gcloud run deploy synchra-backend `
  --image us-central1-docker.pkg.dev/synchra-prod/app/backend:latest `
  --region us-central1 `
  --platform managed `
  --allow-unauthenticated `
  --min-instances 0 `
  --max-instances 10 `
  --memory 512Mi `
  --cpu 1 `
  --timeout 300 `
  --set-env-vars NODE_ENV=production `
  --set-secrets FIREBASE_SERVICE_ACCOUNT=firebase-admin-key:latest

# Get the URL
gcloud run services describe synchra-backend --region us-central1 --format "value(status.url)"
```

### 4. Setup Cloud Build Trigger (GitHub Auto-Deploy)
```powershell
# Connect GitHub repo and create trigger
gcloud builds triggers create github `
  --name=synchra-deploy `
  --repo-name=Synchra `
  --repo-owner=Pankajjakhar04 `
  --branch-pattern="^main$" `
  --build-config=cloudbuild.yaml

# Grant permissions to Cloud Build
$PROJECT_NUMBER = (gcloud projects describe $PROJECT_ID --format="value(projectNumber)")

gcloud projects add-iam-policy-binding $PROJECT_ID `
  --member="serviceAccount:$PROJECT_NUMBER@cloudbuild.gserviceaccount.com" `
  --role="roles/run.admin"

gcloud projects add-iam-policy-binding $PROJECT_ID `
  --member="serviceAccount:$PROJECT_NUMBER@cloudbuild.gserviceaccount.com" `
  --role="roles/iam.serviceAccountUser"

gcloud projects add-iam-policy-binding $PROJECT_ID `
  --member="serviceAccount:$PROJECT_NUMBER@cloudbuild.gserviceaccount.com" `
  --role="roles/secretmanager.secretAccessor"
```

### 5. Deploy Redis (Self-Hosted on Cloud Run)
```powershell
cd redis

# Build and deploy
gcloud builds submit --tag us-central1-docker.pkg.dev/synchra-prod/app/redis:latest

gcloud run deploy synchra-redis `
  --image us-central1-docker.pkg.dev/synchra-prod/app/redis:latest `
  --region us-central1 `
  --platform managed `
  --no-allow-unauthenticated `
  --min-instances 1 `
  --max-instances 1 `
  --memory 256Mi `
  --cpu 1 `
  --port 6379

# Get Redis URL for backend configuration
gcloud run services describe synchra-redis --region us-central1 --format "value(status.url)"
```

### 6. Frontend Deployment (Vercel)
```powershell
cd frontend

# Install Vercel CLI
npm install -g vercel

# Login
vercel login

# Deploy
vercel --prod

# Or link to existing project
vercel link
vercel --prod
```

### 7. Check Deployment Status
```powershell
# List Cloud Run services
gcloud run services list --region us-central1

# Check recent builds
gcloud builds list --limit=5

# View logs
gcloud run services logs read synchra-backend --region us-central1 --limit=50
```

### 8. Monitor Costs
```powershell
# View current costs
Start-Process "https://console.cloud.google.com/billing/$PROJECT_ID/reports"

# List billing account
gcloud billing accounts list
```

## Common Issues & Fixes

### Issue: Backend deployment fails
```powershell
# Check build logs
$BUILD_ID = (gcloud builds list --limit=1 --format="value(id)")
gcloud builds log $BUILD_ID
```

### Issue: Cloud Run cold starts
```powershell
# Increase min-instances (costs more)
gcloud run services update synchra-backend --min-instances 1 --region us-central1
```

### Issue: Secret Manager access denied
```powershell
# Grant access to Cloud Run service account
$SERVICE_ACCOUNT = (gcloud run services describe synchra-backend --region us-central1 --format="value(spec.template.spec.serviceAccountName)")

gcloud secrets add-iam-policy-binding firebase-admin-key `
  --member="serviceAccount:$SERVICE_ACCOUNT" `
  --role="roles/secretmanager.secretAccessor"
```

## Environment Setup Checklist

- [ ] GCP project created and billing enabled
- [ ] All APIs enabled
- [ ] GCS bucket created
- [ ] Artifact Registry repository created
- [ ] Firebase Admin SDK key in Secret Manager
- [ ] Backend deployed to Cloud Run
- [ ] Redis deployed to Cloud Run
- [ ] Frontend deployed to Vercel
- [ ] Supabase project created
- [ ] Environment variables configured
- [ ] Cloudflare DNS configured
- [ ] Budget alerts set at $10, $20, $50

## Next: Start Development

Once deployment is complete, proceed to Week 2:
- Implement clock synchronization (D3)
- Build PlaybackState state machine (D1)
- Create SyncEngine (D2)
- Integrate YouTube player

Target: < $20 GCP spend by end of Week 4
