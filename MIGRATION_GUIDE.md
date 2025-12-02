# Database Migration Guide

## How to Run the Migration

### Option 1: Supabase Dashboard (Recommended)

1. Go to your Supabase project: https://supabase.com/dashboard
2. Navigate to **SQL Editor** in the left sidebar
3. Click **New Query**
4. Copy the contents of `migrations/002_add_companies_and_tracking.sql`
5. Paste into the SQL editor
6. Click **Run** (or press Cmd/Ctrl + Enter)
7. Verify success - you should see "Success. No rows returned"

### Option 2: Supabase CLI (If you have it installed)

```bash
# From project root
supabase db push migrations/002_add_companies_and_tracking.sql
```

## What This Migration Does

### New Tables Created
1. **companies** - Store company information (Moelis, Goldman Sachs, etc.)
2. **timeline_notes** - Chronological notes/interactions per contact

### Modified Tables
- **contacts** - Added 9 new columns:
  - `company_id` - Link to company
  - `phone` - Phone number
  - `tags` - Array of tags (divisions, sources, custom)
  - `email_date` - When first emailed
  - `phone_date` - When first called
  - `last_contact_date` - Last interaction
  - `next_followup_date` - Reminder date
  - `quality` - Rating (good, okay, poor)
  - `email_history` - JSON of Gmail threads

### Auto-Status Updates (NEW!)
The migration includes **database triggers** that automatically:
- Update contact status from `none` → `emailed` when you send an email
- Set `email_date` and `last_contact_date` automatically
- Create timeline note when email is sent

This means **you don't have to manually update status anymore** - it happens automatically when you send emails through the app!

## Verify Migration Success

After running the migration, verify it worked:

```sql
-- Check new tables exist
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('companies', 'timeline_notes');

-- Check contacts table has new columns
SELECT column_name FROM information_schema.columns
WHERE table_name = 'contacts'
AND column_name IN ('company_id', 'tags', 'phone', 'quality');
```

## Rollback (If Needed)

If something goes wrong, you can rollback:

```sql
-- Drop new tables
DROP TABLE IF EXISTS public.timeline_notes CASCADE;
DROP TABLE IF EXISTS public.companies CASCADE;

-- Remove new columns from contacts
ALTER TABLE public.contacts
    DROP COLUMN IF EXISTS company_id,
    DROP COLUMN IF EXISTS phone,
    DROP COLUMN IF EXISTS tags,
    DROP COLUMN IF EXISTS email_date,
    DROP COLUMN IF EXISTS phone_date,
    DROP COLUMN IF EXISTS last_contact_date,
    DROP COLUMN IF EXISTS next_followup_date,
    DROP COLUMN IF EXISTS quality,
    DROP COLUMN IF EXISTS email_history;

-- Drop triggers
DROP TRIGGER IF EXISTS update_contact_on_email_sent ON public.sent_emails;
DROP TRIGGER IF EXISTS create_note_on_email_sent ON public.sent_emails;
DROP FUNCTION IF EXISTS auto_update_contact_on_email();
DROP FUNCTION IF EXISTS create_timeline_note_on_email();
```

## Next Steps

After migration succeeds:
1. ✅ Database is ready
2. ⏭️ Start backend server to use new API endpoints
3. ⏭️ Frontend will be updated to use company/contact views
