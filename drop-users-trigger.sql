-- Drop the problematic trigger on users table
-- Run this in Supabase SQL Editor

DROP TRIGGER IF EXISTS update_users_updated_at ON public.users;

-- Verify updated_at column exists
ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
