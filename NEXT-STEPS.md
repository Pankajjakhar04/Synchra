# 🚀 Synchra Deployment - What's Ready & What's Next

## ✅ What We Just Created

### 1. **Infrastructure-as-Code**
- ✅ `cloudbuild.yaml` - Automated CI/CD pipeline that deploys on every push to main
- ✅ `scripts/gcp-setup.sh` - Complete GCP infrastructure setup script
- ✅ `backend/Dockerfile` - Production-ready containerization
- ✅ `redis/Dockerfile` + `redis.conf` - Self-hosted Redis for Cloud Run
- ✅ `vercel.json` - Frontend deployment configuration

### 2. **Documentation**
- ✅ `DEPLOYMENT.md` - Complete step-by-step deployment guide
- ✅ `QUICKSTART.md` - PowerShell commands ready to copy/paste
- ✅ `.dockerignore` - Optimized Docker builds

### 3. **Git Repository**
- ✅ All configs committed and pushed to GitHub
- ✅ Secret file removed from history
- ✅ `.gitignore` updated to prevent future credential leaks

---

## 🎯 YOUR IMMEDIATE NEXT STEPS (In Order)

### **STEP 1: Set Up GCP Project** ⏱️ 10 minutes

**Windows PowerShell:**
```powershell
# Login to GCP
gcloud auth login

# Create project
$PROJECT_ID = "synchra-prod"
gcloud projects create $PROJECT_ID --name="Synchra Production"
gcloud config set project $PROJECT_ID
```

**Then go to GCP Console and enable billing:**
👉 https://console.cloud.google.com/billing/linkedaccount?project=synchra-prod

⚠️ **CRITICAL**: You must enable billing to use the $300 free credits!

---

### **STEP 2: Run Infrastructure Setup** ⏱️ 15 minutes

**Option A - Automated (Linux/Mac/WSL):**
```bash
cd d:\SYNCHRA
chmod +x scripts/gcp-setup.sh
./scripts/gcp-setup.sh
```

**Option B - Manual (Windows PowerShell):**
```powershell
# Copy commands from QUICKSTART.md section "1. GCP Setup"
# Run them one by one in PowerShell
```

This will create:
- GCS bucket for videos
- Artifact Registry for Docker images
- Enable all required APIs
- Configure Docker authentication

---

### **STEP 3: Firebase Setup** ⏱️ 10 minutes

1. **Go to Firebase Console:**
   👉 https://console.firebase.google.com/

2. **Create/Select Project:**
   - Use same project ID: `synchra-prod`
   - Or create new Firebase project

3. **Enable Authentication:**
   - Authentication → Sign-in method
   - Enable **Google** provider
   - Enable **Anonymous** provider

4. **Generate NEW Admin SDK Key:**
   - Project Settings → Service Accounts
   - Click "Generate new private key"
   - **SAVE the JSON file somewhere safe**

5. **⚠️ REVOKE OLD KEY** (the one that was exposed):
   - Find the old key in Service Accounts
   - Delete it immediately!

6. **Store in Secret Manager:**
   ```powershell
   gcloud secrets create firebase-admin-key --data-file="C:\path\to\your\new-key.json"
   ```

7. **Delete the local JSON file** after uploading to Secret Manager!

---

### **STEP 4: Supabase Setup** ⏱️ 5 minutes

1. Go to **https://supabase.com/**
2. Create new project (free tier)
3. Note these values:
   - Project URL
   - `anon` public key
   - `service_role` secret key (for backend)

4. Create initial tables (we'll add migrations later):
   ```sql
   -- Run this in Supabase SQL Editor
   CREATE TABLE rooms (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     code VARCHAR(8) UNIQUE NOT NULL,
     host_id TEXT NOT NULL,
     created_at TIMESTAMPTZ DEFAULT NOW()
   );

   CREATE TABLE participants (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     room_id UUID REFERENCES rooms(id),
     user_id TEXT NOT NULL,
     joined_at TIMESTAMPTZ DEFAULT NOW()
   );
   ```

---

### **STEP 5: Deploy Backend to Cloud Run** ⏱️ 10 minutes

**Option A - Automated (Cloud Build Trigger):**
```powershell
# Connect GitHub repo
gcloud builds triggers create github `
  --name=synchra-deploy `
  --repo-name=Synchra `
  --repo-owner=Pankajjakhar04 `
  --branch-pattern="^main$" `
  --build-config=cloudbuild.yaml

# Grant permissions
$PROJECT_NUMBER = (gcloud projects describe synchra-prod --format="value(projectNumber)")
gcloud projects add-iam-policy-binding synchra-prod --member="serviceAccount:$PROJECT_NUMBER@cloudbuild.gserviceaccount.com" --role="roles/run.admin"
gcloud projects add-iam-policy-binding synchra-prod --member="serviceAccount:$PROJECT_NUMBER@cloudbuild.gserviceaccount.com" --role="roles/iam.serviceAccountUser"
gcloud projects add-iam-policy-binding synchra-prod --member="serviceAccount:$PROJECT_NUMBER@cloudbuild.gserviceaccount.com" --role="roles/secretmanager.secretAccessor"

# Trigger first build
gcloud builds triggers run synchra-deploy --branch=main
```

**Option B - Manual Deploy:**
```powershell
cd backend
gcloud builds submit --tag us-central1-docker.pkg.dev/synchra-prod/app/backend:latest

gcloud run deploy synchra-backend `
  --image us-central1-docker.pkg.dev/synchra-prod/app/backend:latest `
  --region us-central1 `
  --allow-unauthenticated `
  --set-secrets FIREBASE_SERVICE_ACCOUNT=firebase-admin-key:latest
```

**Get your backend URL:**
```powershell
gcloud run services describe synchra-backend --region us-central1 --format "value(status.url)"
```
**Save this URL!** You'll need it for frontend config.

---

### **STEP 6: Deploy Frontend to Vercel** ⏱️ 10 minutes

```powershell
cd frontend

# Install Vercel CLI (if not installed)
npm install -g vercel

# Login
vercel login

# Deploy
vercel --prod
```

**Set environment variables in Vercel dashboard:**
1. Go to your project → Settings → Environment Variables
2. Add these:
   ```
   VITE_API_URL=<your-cloud-run-backend-url>
   VITE_SOCKET_URL=<your-cloud-run-backend-url>
   
   # From Firebase Console → Project Settings → General → Your apps → Web
   VITE_FIREBASE_API_KEY=...
   VITE_FIREBASE_AUTH_DOMAIN=...
   VITE_FIREBASE_PROJECT_ID=...
   VITE_FIREBASE_STORAGE_BUCKET=...
   VITE_FIREBASE_MESSAGING_SENDER_ID=...
   VITE_FIREBASE_APP_ID=...
   ```

3. Redeploy to pick up env vars:
   ```powershell
   vercel --prod
   ```

---

### **STEP 7: Set Up Budget Alerts** ⏱️ 5 minutes

1. Go to **GCP Console → Billing → Budgets & alerts**
   👉 https://console.cloud.google.com/billing/budgets

2. Create new budget:
   - Budget name: "Synchra Weekly Monitor"
   - Projects: synchra-prod
   - Budget type: Specified amount
   - Target amount: $300
   - Threshold rules:
     - 3% ($10) - Email alert
     - 7% ($20) - Email alert
     - 17% ($50) - Email alert

3. Add your email for notifications

---

### **STEP 8: Test Everything** ⏱️ 10 minutes

1. **Backend health:**
   ```powershell
   curl <your-backend-url>/health
   ```

2. **Frontend:**
   - Visit your Vercel URL
   - Open browser console
   - Check for errors

3. **Firebase Auth:**
   - Try signing in with Google
   - Check Firebase Console → Authentication → Users

4. **Integration:**
   - Create a test room
   - Share link and join from incognito window
   - Verify both connections appear

---

## 📊 Cost Monitoring

**Check your spend weekly:**
```powershell
# Open billing dashboard
Start-Process "https://console.cloud.google.com/billing/synchra-prod/reports"
```

**Target spending:**
- Week 1: < $5 (just infrastructure setup)
- Week 4: < $20 total
- Week 8: < $100 total
- Week 12: < $250 total

**Free tier services (don't count against budget):**
- ✅ Vercel (frontend hosting)
- ✅ Supabase (500MB DB)
- ✅ Cloudflare (CDN/DNS)
- ✅ Firebase Auth (< 10k users)

---

## 🔧 Troubleshooting

### "gcloud: command not found"
Install Google Cloud SDK: https://cloud.google.com/sdk/docs/install

### "Permission denied" on Cloud Run deploy
Run the IAM binding commands from STEP 5

### Frontend can't connect to backend
1. Check CORS in backend code
2. Verify `VITE_API_URL` in Vercel
3. Check browser console for errors

### Cloud Build fails
```powershell
gcloud builds list --limit=1
# Copy the BUILD_ID
gcloud builds log <BUILD_ID>
```

---

## 📚 What to Read Next

1. **For deployment**: Read `DEPLOYMENT.md` (comprehensive guide)
2. **For quick commands**: Use `QUICKSTART.md` (copy/paste ready)
3. **For architecture**: Review `SYNCHRA_BLUEPRINT_GCP.txt`

---

## 🎯 After Successful Deployment

Once everything is deployed and working:

### **Week 2 Tasks** (Core Sync Implementation):
- [ ] Clock synchronization algorithm (blueprint section D3)
- [ ] PlaybackState state machine (D1)
- [ ] SyncEngine drift correction (D2)
- [ ] YouTube player integration
- [ ] Basic play/pause/seek sync

### **Development Workflow:**
```powershell
# Make changes to code
git add .
git commit -m "Your changes"
git push origin main

# Cloud Build automatically deploys backend
# Vercel automatically deploys frontend
```

---

## ✅ Quick Checklist

**Before you start coding:**
- [ ] GCP project created with billing enabled
- [ ] Firebase project created with Auth enabled
- [ ] NEW Firebase Admin SDK key in Secret Manager
- [ ] OLD Firebase key deleted/revoked
- [ ] Supabase project created
- [ ] Backend deployed to Cloud Run
- [ ] Frontend deployed to Vercel
- [ ] Budget alerts configured at $10/$20/$50
- [ ] Test room creation works end-to-end

**After checklist complete:**
- [ ] Star this repo! 😄
- [ ] Begin Week 2 development
- [ ] Monitor costs daily for first week

---

## 💡 Pro Tips

1. **Use Cloud Shell** (free) instead of local gcloud: https://shell.cloud.google.com/
2. **Enable Cloud Run scale-to-zero** to save costs during development
3. **Use Supabase free tier** until you hit 500MB limit
4. **Cloudflare CDN** saves on GCS egress costs
5. **Monitor daily** for the first week to catch any unexpected charges

---

## 🆘 Need Help?

1. Check Cloud Run logs: `gcloud run services logs read synchra-backend --limit=50`
2. Check Cloud Build history: `gcloud builds list --limit=5`
3. Review `DEPLOYMENT.md` for detailed troubleshooting
4. Check Firebase Console for auth errors
5. Check Vercel deployment logs in dashboard

---

**🎯 Your target: Complete setup in ~90 minutes**

**📊 Cost target: < $5 spent by end of this week**

Good luck! 🚀
