# Database Migration Instructions

## Overview
This migration adds all missing tables and fields needed for the CRM and Calendar features.

## What's Being Added

### New Tables
- ✅ `companies` - Store target companies with rankings
- ✅ `events` - Calendar events with Google Calendar sync
- ✅ `timeline_notes` - Chronological notes for each contact

### Updated Tables
- ✅ `users` - Added Google Calendar sync settings
- ✅ `contacts` - Added CRM fields (status, quality, tags, dates, company_id)

### New Features Enabled
- ✅ Company-based contact organization
- ✅ Contact status tracking (none → emailed → called)
- ✅ Quality ratings for contacts
- ✅ Tag system for contacts
- ✅ Timeline notes for interaction history
- ✅ Calendar events with Google sync
- ✅ Event types (coffee_chat, networking_event, interview, etc.)

---

## Migration Steps

### Option 1: Fresh Database (Recommended if you have no production data)

1. **Go to Supabase Dashboard**
   - Navigate to: https://app.supabase.com
   - Select your project

2. **Open SQL Editor**
   - Click "SQL Editor" in the left sidebar
   - Click "New Query"

3. **Run the Migration**
   - Copy the entire contents of `supabase-migration-complete.sql`
   - Paste into the SQL editor
   - Click "Run" (or press Cmd/Ctrl + Enter)

4. **Verify Success**
   - Check that all tables appear in the "Table Editor"
   - You should see: users, companies, contacts, timeline_notes, events, templates, sent_emails

---

### Option 2: Existing Database (If you have production data)

⚠️ **BACKUP FIRST!** Go to Database → Backups → Create Backup

#### Step 1: Check What Already Exists

Run this query to see what tables you have:
```sql
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public';
```

#### Step 2: Run Migration Selectively

The migration file uses `CREATE TABLE IF NOT EXISTS`, so it's safe to run even if tables exist.

However, if you have existing data in `contacts` or `users`, you need to be careful with the new columns.

**Check if you have existing contacts:**
```sql
SELECT COUNT(*) FROM public.contacts;
```

**If you have existing contacts, run this first:**
```sql
-- Add new columns to existing contacts table
ALTER TABLE public.contacts
ADD COLUMN IF NOT EXISTS company_id INTEGER REFERENCES public.companies(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS phone VARCHAR(50),
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'none',
ADD COLUMN IF NOT EXISTS quality TEXT,
ADD COLUMN IF NOT EXISTS tags TEXT[],
ADD COLUMN IF NOT EXISTS email_date TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS phone_date TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS last_contact_date TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS next_followup_date TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS email_history JSONB;

-- Add constraint for status
ALTER TABLE public.contacts
DROP CONSTRAINT IF EXISTS contacts_status_check;

ALTER TABLE public.contacts
ADD CONSTRAINT contacts_status_check
CHECK (status IN ('none', 'emailed', 'called'));

-- Add constraint for quality
ALTER TABLE public.contacts
DROP CONSTRAINT IF EXISTS contacts_quality_check;

ALTER TABLE public.contacts
ADD CONSTRAINT contacts_quality_check
CHECK (quality IN ('good', 'okay', 'poor'));

-- Update existing contacts to have default status
UPDATE public.contacts
SET status = 'none'
WHERE status IS NULL;
```

**Then add Google Calendar fields to users:**
```sql
ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS google_calendar_sync_enabled BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS google_calendar_id TEXT;
```

**Then run the full migration file** to create new tables (companies, events, timeline_notes).

---

### Step 3: Verify Migration

Run these queries to check everything worked:

```sql
-- Check companies table exists
SELECT * FROM public.companies LIMIT 1;

-- Check events table exists
SELECT * FROM public.events LIMIT 1;

-- Check timeline_notes table exists
SELECT * FROM public.timeline_notes LIMIT 1;

-- Check contacts has new columns
SELECT column_name
FROM information_schema.columns
WHERE table_name = 'contacts' AND table_schema = 'public';

-- Check users has calendar columns
SELECT column_name
FROM information_schema.columns
WHERE table_name = 'users' AND table_schema = 'public'
AND column_name LIKE '%calendar%';
```

---

## Rollback (If Something Goes Wrong)

If you backed up before migrating:
1. Go to Database → Backups
2. Find your backup
3. Click "Restore"

If you didn't backup but need to undo:
```sql
-- Drop new tables (WARNING: This deletes all data!)
DROP TABLE IF EXISTS public.events CASCADE;
DROP TABLE IF EXISTS public.timeline_notes CASCADE;
DROP TABLE IF EXISTS public.companies CASCADE;

-- Remove new columns from contacts
ALTER TABLE public.contacts
DROP COLUMN IF EXISTS company_id,
DROP COLUMN IF EXISTS phone,
DROP COLUMN IF EXISTS status,
DROP COLUMN IF EXISTS quality,
DROP COLUMN IF EXISTS tags,
DROP COLUMN IF EXISTS email_date,
DROP COLUMN IF EXISTS phone_date,
DROP COLUMN IF EXISTS last_contact_date,
DROP COLUMN IF EXISTS next_followup_date,
DROP COLUMN IF EXISTS email_history;

-- Remove new columns from users
ALTER TABLE public.users
DROP COLUMN IF EXISTS google_calendar_sync_enabled,
DROP COLUMN IF EXISTS google_calendar_id;
```

---

## Post-Migration: Test Your Backend

After running the migration, test that your backend can connect:

```bash
# From the backend directory
cd backend
npm start
```

Then test the new endpoints:
```bash
# Test companies endpoint
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:3001/api/companies

# Test events endpoint
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:3001/api/events

# Test calendar sync status
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:3001/api/calendar/sync-status
```

---

## Next Steps After Migration

1. ✅ Migration complete
2. 🆕 Build Calendar UI (next task)
3. 🆕 Build Event creation modal
4. 🆕 Add "Schedule Event" buttons to Contacts/Companies pages
5. 🆕 Test Google Calendar sync

---

## Troubleshooting

### Error: "relation already exists"
- Safe to ignore if using `CREATE TABLE IF NOT EXISTS`
- Or run `DROP TABLE` first (only if you don't have data)

### Error: "column already exists"
- Safe to ignore if using `ADD COLUMN IF NOT EXISTS`
- Or check if column already has data

### Error: "constraint already exists"
- Drop the constraint first:
  ```sql
  ALTER TABLE contacts DROP CONSTRAINT IF EXISTS contacts_status_check;
  ```

### RLS Policies Conflict
- Drop old policies:
  ```sql
  DROP POLICY IF EXISTS "policy_name" ON table_name;
  ```

---

## Questions?

If you run into issues:
1. Check the Supabase logs (Settings → Database → Logs)
2. Make sure you're running as the `postgres` user (default in SQL Editor)
3. Check that RLS is enabled: `SHOW row_security;`

---

**Ready to migrate?** Run `supabase-migration-complete.sql` in your Supabase SQL Editor!
