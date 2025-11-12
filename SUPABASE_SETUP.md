# Supabase Setup Guide

This guide will walk you through connecting your IB Networking App to Supabase.

## Prerequisites

- A Supabase account (sign up at https://supabase.com)
- Node.js and npm installed
- Your existing project code

## Step 1: Create a Supabase Project

1. Go to https://supabase.com/dashboard
2. Click "New Project"
3. Fill in the project details:
   - Name: `ib-networking-app` (or your preferred name)
   - Database Password: Choose a strong password (save this!)
   - Region: Select the region closest to your users
4. Click "Create new project"
5. Wait for the project to finish setting up (2-3 minutes)

## Step 2: Run the Database Migration

1. In your Supabase dashboard, go to the **SQL Editor** (left sidebar)
2. Click "New Query"
3. Copy the entire contents of `supabase-migration.sql` from this project
4. Paste it into the SQL Editor
5. Click "Run" to execute the migration
6. You should see "Success. No rows returned" - this is normal!

## Step 3: Get Your Supabase Credentials

1. In your Supabase dashboard, go to **Settings** → **API** (left sidebar)
2. You'll need three values:
   - **Project URL**: Found under "Project URL" (looks like `https://xxxxx.supabase.co`)
   - **anon public key**: Found under "Project API keys" → "anon public"
   - **service_role key**: Found under "Project API keys" → "service_role" (keep this secret!)

## Step 4: Configure Backend Environment Variables

1. Navigate to the `backend/` directory
2. Copy the example environment file:
   ```bash
   cp .env.example .env
   ```
3. Edit `.env` and fill in your Supabase credentials:
   ```env
   # Server Configuration
   PORT=3001
   NODE_ENV=development
   FRONTEND_URL=http://localhost:3000

   # Supabase Configuration
   SUPABASE_URL=https://your-project-id.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
   SUPABASE_ANON_KEY=your-anon-key-here

   # JWT Configuration
   JWT_SECRET=your-super-secret-jwt-key-change-this-in-production

   # Google OAuth Configuration
   GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
   GOOGLE_CLIENT_SECRET=your-google-client-secret
   GOOGLE_REDIRECT_URI=http://localhost:3001/api/gmail/callback
   ```

## Step 5: Configure Frontend Environment Variables

1. Navigate to the `frontend/` directory
2. Copy the example environment file:
   ```bash
   cp .env.example .env.local
   ```
3. Edit `.env.local` and fill in your Supabase credentials:
   ```env
   # API Configuration
   REACT_APP_API_URL=http://localhost:3001

   # Supabase Configuration
   REACT_APP_SUPABASE_URL=https://your-project-id.supabase.co
   REACT_APP_SUPABASE_ANON_KEY=your-anon-key-here
   ```

## Step 6: Install Dependencies

Make sure all dependencies are installed:

```bash
# Backend
cd backend
npm install

# Frontend
cd ../frontend
npm install
```

## Step 7: Start Your Application

Start both the backend and frontend:

```bash
# Terminal 1 - Backend
cd backend
npm start

# Terminal 2 - Frontend
cd frontend
npm start
```

Your app should now be running with Supabase! 🎉

## Step 8: Verify the Connection

1. Open your browser to http://localhost:3000
2. Try signing up with a new account
3. Check your Supabase dashboard → **Table Editor** → `users` table
4. You should see your new user account listed

## Troubleshooting

### "Error: Supabase credentials not found"
- Make sure you copied `.env.example` to `.env` in the backend directory
- Verify all three Supabase variables are set in `.env`
- Restart your backend server after updating `.env`

### "Row Level Security policy violation"
- Make sure you ran the complete migration script in Supabase SQL Editor
- Check that RLS policies were created (they're at the bottom of the migration script)

### "Invalid API key"
- Double-check you copied the correct keys from Supabase dashboard
- Make sure you're using the **service_role** key in the backend (not anon key)
- Make sure you're using the **anon** key in the frontend (not service_role)

### Database connection errors
- Verify your Supabase project is active (not paused)
- Check that the SUPABASE_URL matches your project URL exactly
- Ensure there are no trailing slashes in the URL

## Migration Notes

### What Changed?

1. **Database Connection**: Replaced `pg` Pool with Supabase client
2. **Query Syntax**: Converted SQL queries to Supabase JS syntax
3. **Authentication**: Still using custom JWT auth (can migrate to Supabase Auth later)
4. **File Storage**: Resume files still stored in database (can migrate to Supabase Storage later)

### Future Improvements

Consider these enhancements:

1. **Supabase Auth**: Migrate from custom JWT to Supabase's built-in authentication
2. **Supabase Storage**: Move resume files from database to Supabase Storage buckets
3. **Real-time**: Add real-time features using Supabase's real-time subscriptions
4. **Edge Functions**: Move some backend logic to Supabase Edge Functions

## Additional Resources

- [Supabase Documentation](https://supabase.com/docs)
- [Supabase JavaScript Client](https://supabase.com/docs/reference/javascript/introduction)
- [Row Level Security Guide](https://supabase.com/docs/guides/auth/row-level-security)
- [Supabase Storage Guide](https://supabase.com/docs/guides/storage)

## Support

If you encounter issues:
1. Check the Supabase dashboard logs
2. Check your browser console for errors
3. Check your backend server logs
4. Verify all environment variables are set correctly
