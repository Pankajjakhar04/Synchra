#!/bin/bash
# GCP Infrastructure Setup Script
# Phase 1 - Week 1 Foundation
# Target spend: < $20

set -e

echo "🚀 Setting up GCP infrastructure for Synchra..."

# Configuration
PROJECT_ID="synchra-prod"
REGION="us-central1"
BUCKET_NAME="synchra-videos"
REGISTRY_NAME="app"
REGISTRY_PATH="${REGION}-docker.pkg.dev/${PROJECT_ID}/${REGISTRY_NAME}"

# Step 1: Create GCP project
echo "📦 Creating GCP project..."
gcloud projects create ${PROJECT_ID} --name="Synchra Production" || echo "Project already exists"
gcloud config set project ${PROJECT_ID}

# Step 2: Link billing account (you need to do this manually first)
echo "⚠️  IMPORTANT: Ensure billing is enabled for this project in GCP Console"
echo "   Visit: https://console.cloud.google.com/billing/linkedaccount?project=${PROJECT_ID}"
read -p "Press Enter once billing is enabled..."

# Step 3: Enable required APIs
echo "🔌 Enabling required GCP APIs..."
gcloud services enable \
  run.googleapis.com \
  cloudbuild.googleapis.com \
  artifactregistry.googleapis.com \
  storage.googleapis.com \
  secretmanager.googleapis.com \
  cloudscheduler.googleapis.com \
  pubsub.googleapis.com \
  logging.googleapis.com \
  monitoring.googleapis.com

echo "✅ APIs enabled"

# Step 4: Create GCS bucket for videos
echo "🪣 Creating Cloud Storage bucket..."
gcloud storage buckets create gs://${BUCKET_NAME} \
  --location=${REGION} \
  --uniform-bucket-level-access \
  --public-access-prevention || echo "Bucket already exists"

# Enable CORS for video streaming
cat > /tmp/cors.json <<EOF
[
  {
    "origin": ["*"],
    "method": ["GET", "HEAD"],
    "responseHeader": ["Content-Type", "Range"],
    "maxAgeSeconds": 3600
  }
]
EOF
gcloud storage buckets update gs://${BUCKET_NAME} --cors-file=/tmp/cors.json
rm /tmp/cors.json

echo "✅ GCS bucket created"

# Step 5: Create Artifact Registry repository
echo "🐳 Creating Artifact Registry repository..."
gcloud artifacts repositories create ${REGISTRY_NAME} \
  --repository-format=docker \
  --location=${REGION} \
  --description="Synchra Docker images" || echo "Repository already exists"

echo "✅ Artifact Registry created: ${REGISTRY_PATH}"

# Step 6: Configure Docker authentication
echo "🔐 Configuring Docker authentication..."
gcloud auth configure-docker ${REGION}-docker.pkg.dev

# Step 7: Set up Secret Manager
echo "🔒 Setting up Secret Manager..."
echo "⚠️  Next step: You need to create Firebase credentials manually"
echo "   1. Go to Firebase Console > Project Settings > Service Accounts"
echo "   2. Click 'Generate new private key'"
echo "   3. Save the JSON file"
echo ""
read -p "Enter path to Firebase credentials JSON file: " FIREBASE_KEY_PATH

if [ -f "$FIREBASE_KEY_PATH" ]; then
  gcloud secrets create firebase-admin-key \
    --data-file="${FIREBASE_KEY_PATH}" \
    --replication-policy="automatic" || echo "Secret already exists, creating new version..."
  
  if gcloud secrets describe firebase-admin-key &>/dev/null; then
    gcloud secrets versions add firebase-admin-key --data-file="${FIREBASE_KEY_PATH}"
  fi
  
  echo "✅ Firebase credentials stored in Secret Manager"
  echo "⚠️  IMPORTANT: Delete the local JSON file: ${FIREBASE_KEY_PATH}"
else
  echo "❌ Firebase credentials file not found. Skipping Secret Manager setup."
  echo "   Run this later: gcloud secrets create firebase-admin-key --data-file=path/to/key.json"
fi

# Step 8: Set up budget alerts
echo "💰 Setting up budget alerts..."
echo "⚠️  Budget alerts must be configured in GCP Console:"
echo "   1. Go to: https://console.cloud.google.com/billing/${PROJECT_ID}/budgets"
echo "   2. Create budget alerts at: $10, $20, $50"
echo "   3. Set email notifications to your email"

# Step 9: Grant Cloud Build permissions
echo "🔧 Configuring Cloud Build permissions..."
PROJECT_NUMBER=$(gcloud projects describe ${PROJECT_ID} --format="value(projectNumber)")
gcloud projects add-iam-policy-binding ${PROJECT_ID} \
  --member="serviceAccount:${PROJECT_NUMBER}@cloudbuild.gserviceaccount.com" \
  --role="roles/run.admin" || true

gcloud projects add-iam-policy-binding ${PROJECT_ID} \
  --member="serviceAccount:${PROJECT_NUMBER}@cloudbuild.gserviceaccount.com" \
  --role="roles/iam.serviceAccountUser" || true

gcloud projects add-iam-policy-binding ${PROJECT_ID} \
  --member="serviceAccount:${PROJECT_NUMBER}@cloudbuild.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor" || true

echo ""
echo "=========================================="
echo "✅ GCP Infrastructure Setup Complete!"
echo "=========================================="
echo ""
echo "Next steps:"
echo "1. ✅ GCP Project: ${PROJECT_ID}"
echo "2. ✅ GCS Bucket: gs://${BUCKET_NAME}"
echo "3. ✅ Artifact Registry: ${REGISTRY_PATH}"
echo "4. ✅ Secret Manager: firebase-admin-key"
echo ""
echo "5. 🔨 Now run: ./deploy-backend.sh"
echo "6. 🌐 Then setup Vercel for frontend"
echo "7. 🔧 Finally configure Cloudflare DNS"
echo ""
echo "📊 Monitor costs: https://console.cloud.google.com/billing/${PROJECT_ID}/reports"
echo "🎯 Target Week 1 spend: < $20"
echo ""
