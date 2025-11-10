# Quick Start Guide

Get your IB Networking Email App running in 5 minutes!

## Step 1: Set up Database (2 minutes)

You need a PostgreSQL database. Choose one option:

### Option A: Local PostgreSQL
```bash
createdb ib_networking
```

### Option B: Free Cloud Database
Use one of these free tiers:
- **Neon** (https://neon.tech) - Easiest, no credit card
- **Supabase** (https://supabase.com) - Good free tier
- **Railway** (https://railway.app) - Simple setup

After creating your database, copy the connection string (looks like `postgresql://user:pass@host:5432/db`).

## Step 2: Set up Google OAuth (3 minutes)

1. Go to https://console.cloud.google.com/
2. Create a new project
3. Enable Gmail API:
   - Click "Enable APIs and Services"
   - Search "Gmail API"
   - Click "Enable"
4. Create credentials:
   - Go to "Credentials" tab
   - Click "Create Credentials" > "OAuth client ID"
   - Choose "Web application"
   - Name it "IB Networking App"
   - Add Authorized redirect URI: `http://localhost:3001/api/gmail/callback`
   - Click "Create"
   - **Copy the Client ID and Client Secret**

## Step 3: Configure Backend

```bash
cd backend

# Install dependencies
npm install

# Create .env file
cp .env.example .env

# Edit .env with your favorite editor (nano, vim, or VSCode)
nano .env

# Add these values:
# DATABASE_URL=postgresql://your-connection-string
# JWT_SECRET=any-random-string-here-make-it-long
# GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
# GOOGLE_CLIENT_SECRET=your-client-secret
# GOOGLE_REDIRECT_URI=http://localhost:3001/api/gmail/callback
```

## Step 4: Start Backend

```bash
# Still in backend directory
npm start
```

You should see:
```
Database initialized successfully
Server running on port 3001
```

Leave this terminal running!

## Step 5: Start Frontend

Open a NEW terminal:

```bash
cd frontend
npm install
npm start
```

The app will open in your browser at http://localhost:3000

## Step 6: Use the App!

1. **Sign up** for an account
2. **Connect Gmail** (click the button on dashboard)
3. **Seed templates** (optional, in a new terminal):
   ```bash
   cd backend
   node seed-templates.js
   ```
4. **Start sending emails!**

## Troubleshooting

### "Cannot connect to database"
- Check your DATABASE_URL is correct
- Make sure PostgreSQL is running (if local)
- Test connection string in a database client

### "Gmail connection fails"
- Verify redirect URI is EXACTLY: `http://localhost:3001/api/gmail/callback`
- Check Client ID and Secret are correct
- Make sure Gmail API is enabled

### "Port 3000 is already in use"
- Kill other apps using port 3000, or
- The app will prompt you to use 3001 instead

### Still stuck?
Check the main [README.md](README.md) for detailed troubleshooting.

## What's Next?

- Create your own email templates
- Customize templates for different banks
- Track your networking progress
- Send personalized emails at scale

Happy networking! 📧
