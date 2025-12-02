-- Fix users table - add missing updated_at column
-- Run this in Supabase SQL Editor

-- Add updated_at column if it doesn't exist
ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Update existing records to have updated_at = created_at
UPDATE public.users
SET updated_at = created_at
WHERE updated_at IS NULL;

-- Ensure the trigger exists for users table
DROP TRIGGER IF EXISTS update_users_updated_at ON public.users;

CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON public.users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
