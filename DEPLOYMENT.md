# Deployment Guide

## Overview
Deploy the IB Networking App using Vercel (frontend) and Railway (backend).

---

## Part 1: Deploy Backend to Railway

### Step 1: Create Railway Account
1. Go to [Railway.app](https://railway.app)
2. Sign up with GitHub

### Step 2: Deploy Backend
1. Click **"New Project"**
2. Select **"Deploy from GitHub repo"**
3. Connect your GitHub account
4. Select this repository: `ib-networking-app`
5. Railway will detect it's a Node.js app

### Step 3: Configure Build Settings
1. Click on your service
2. Go to **Settings**
3. Set **Root Directory**: `backend`
4. Set **Start Command**: `node server.js`

### Step 4: Add Environment Variables
Go to **Variables** tab and add these (copy from `backend/.env.production`):

```
NODE_ENV=production
PORT=3001
FRONTEND_URL=https://YOUR_VERCEL_URL.vercel.app
SUPABASE_URL=https://uasusvdgevopuhwshtmt.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVhc3VzdmRnZXZvcHVod3NodG10Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2Mjg5NDY5MSwiZXhwIjoyMDc4NDcwNjkxfQ.dIRrKENO2pAfHguOabcDYfu3mZWii5JoI__EIszhck8
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVhc3VzdmRnZXZvcHVod3NodG10Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI4OTQ2OTEsImV4cCI6MjA3ODQ3MDY5MX0.TrZvqjzMUYxs_nlzX64-K1geS15E6sp_6QD13tBkrUI
JWT_SECRET=YOUR_STRONG_SECRET_HERE
GOOGLE_CLIENT_ID=1031121207417-v9skuilkn5101uif28ake6khd8s7uhc3.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=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
GOOGLE_REDIRECT_URI=https://YOUR_RAILWAY_URL.railway.app/api/gmail/callback
```

### Step 5: Get Your Railway URL
1. After deployment completes
2. Go to **Settings** → **Networking**
3. Click **Generate Domain**
4. Copy your URL (e.g., `https://your-app.up.railway.app`)

---

## Part 2: Deploy Frontend to Vercel

### Step 1: Create Vercel Account
1. Go to [Vercel.com](https://vercel.com)
2. Sign up with GitHub

### Step 2: Deploy Frontend
1. Click **"Add New..."** → **"Project"**
2. Import your GitHub repository
3. Vercel auto-detects it's a React app
4. Set **Root Directory**: `frontend`
5. Click **Deploy**

### Step 3: Add Environment Variable
1. Go to **Settings** → **Environment Variables**
2. Add:
   - Key: `REACT_APP_API_URL`
   - Value: `https://YOUR_RAILWAY_URL.railway.app` (from Part 1, Step 5)
3. Redeploy

### Step 4: Get Your Vercel URL
Copy your URL (e.g., `https://your-app.vercel.app`)

---

## Part 3: Update Google OAuth Settings

### Step 1: Go to Google Cloud Console
1. Visit [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
2. Select your project
3. Click on your OAuth 2.0 Client ID

### Step 2: Add Production URLs
**Authorized JavaScript origins:**
- Add: `https://your-app.vercel.app`
- Keep: `http://localhost:3000`

**Authorized redirect URIs:**
- Add: `https://your-railway-url.railway.app/api/gmail/callback`
- Keep: `http://localhost:3001/api/gmail/callback`

Click **Save**

---

## Part 4: Update Environment Variables (Round 2)

### Update Railway:
1. Go to Railway Variables
2. Update `FRONTEND_URL` to your Vercel URL
3. Update `GOOGLE_REDIRECT_URI` to your Railway URL + `/api/gmail/callback`

### Update Vercel:
1. Go to Vercel Environment Variables
2. Update `REACT_APP_API_URL` to your Railway URL

---

## Part 5: Update Frontend API Client

You need to update the frontend to use the production backend URL.

In `frontend/src/api/client.js`, the baseURL should be:
```javascript
const baseURL = process.env.REACT_APP_API_URL || 'http://localhost:3001';
```

---

## Testing Checklist

- [ ] Frontend loads at Vercel URL
- [ ] Can create account / login
- [ ] Can connect Gmail (OAuth works)
- [ ] Can send emails
- [ ] Can schedule emails
- [ ] Scheduled emails send automatically

---

## Troubleshooting

### OAuth Not Working
- Check Google Cloud Console redirect URIs match exactly
- Verify `GOOGLE_REDIRECT_URI` in Railway matches
- Clear browser cache and try again

### CORS Errors
- Verify `FRONTEND_URL` in Railway matches your Vercel URL exactly
- Check Railway backend logs for CORS errors

### Backend Not Starting
- Check Railway logs: **Deployments** → **View Logs**
- Verify all environment variables are set
- Check `Start Command` is `node server.js`

---

## Security Notes

- Change `JWT_SECRET` to a strong random string for production
- Never commit `.env` files to git
- Supabase keys are already in use, but consider rotating them
- Your Google OAuth credentials are exposed in this file - consider creating new ones for production

---

## Next Steps After Deployment

1. Test all features thoroughly
2. Share Vercel URL with friends
3. Monitor Railway logs for errors
4. Set up custom domain (optional)
