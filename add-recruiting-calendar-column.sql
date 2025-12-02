-- Add recruiting_calendar_id column to users table
-- Run this in Supabase SQL Editor

ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS recruiting_calendar_id TEXT;

-- Update any existing google_calendar_id to recruiting_calendar_id
UPDATE public.users
SET recruiting_calendar_id = google_calendar_id
WHERE google_calendar_id IS NOT NULL;

-- Optional: Remove old column if it exists (only if you used google_calendar_id before)
-- ALTER TABLE public.users DROP COLUMN IF EXISTS google_calendar_id;
