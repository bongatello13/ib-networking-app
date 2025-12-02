-- Migration: Add Companies and Status System
-- Run this in Supabase SQL Editor

-- Ensure companies table exists
CREATE TABLE IF NOT EXISTS public.companies (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    ranking TEXT DEFAULT 'Target' CHECK (ranking IN ('Heavy Target', 'Target', 'Lower Priority')),
    industry TEXT,
    sector TEXT,
    results_progress TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ensure contacts has all required columns
ALTER TABLE public.contacts ADD COLUMN IF NOT EXISTS company_id INTEGER REFERENCES public.companies(id) ON DELETE SET NULL;
ALTER TABLE public.contacts ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'none';
ALTER TABLE public.contacts ADD COLUMN IF NOT EXISTS quality TEXT;
ALTER TABLE public.contacts ADD COLUMN IF NOT EXISTS tags TEXT[];
ALTER TABLE public.contacts ADD COLUMN IF NOT EXISTS email_date TIMESTAMPTZ;
ALTER TABLE public.contacts ADD COLUMN IF NOT EXISTS phone_date TIMESTAMPTZ;
ALTER TABLE public.contacts ADD COLUMN IF NOT EXISTS last_contact_date TIMESTAMPTZ;
ALTER TABLE public.contacts ADD COLUMN IF NOT EXISTS next_followup_date TIMESTAMPTZ;
ALTER TABLE public.contacts ADD COLUMN IF NOT EXISTS email_history JSONB;

-- Add constraint if not exists (will fail silently if already exists)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'contacts_status_check'
    ) THEN
        ALTER TABLE public.contacts ADD CONSTRAINT contacts_status_check
        CHECK (status IN ('none', 'emailed', 'called'));
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'contacts_quality_check'
    ) THEN
        ALTER TABLE public.contacts ADD CONSTRAINT contacts_quality_check
        CHECK (quality IN ('good', 'okay', 'poor'));
    END IF;
END $$;

-- Create timeline_notes table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.timeline_notes (
    id SERIAL PRIMARY KEY,
    contact_id INTEGER NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    type TEXT CHECK (type IN ('email', 'call', 'meeting', 'general')),
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_companies_user_id ON public.companies(user_id);
CREATE INDEX IF NOT EXISTS idx_contacts_company_id ON public.contacts(company_id);
CREATE INDEX IF NOT EXISTS idx_contacts_status ON public.contacts(status);
CREATE INDEX IF NOT EXISTS idx_timeline_notes_contact_id ON public.timeline_notes(contact_id);

-- Enable Row Level Security (RLS)
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.timeline_notes ENABLE ROW LEVEL SECURITY;

-- RLS Policies for companies
DROP POLICY IF EXISTS "Users can view their own companies" ON public.companies;
CREATE POLICY "Users can view their own companies" ON public.companies
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own companies" ON public.companies;
CREATE POLICY "Users can insert their own companies" ON public.companies
    FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own companies" ON public.companies;
CREATE POLICY "Users can update their own companies" ON public.companies
    FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own companies" ON public.companies;
CREATE POLICY "Users can delete their own companies" ON public.companies
    FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for timeline_notes
DROP POLICY IF EXISTS "Users can view their own timeline notes" ON public.timeline_notes;
CREATE POLICY "Users can view their own timeline notes" ON public.timeline_notes
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own timeline notes" ON public.timeline_notes;
CREATE POLICY "Users can insert their own timeline notes" ON public.timeline_notes
    FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own timeline notes" ON public.timeline_notes;
CREATE POLICY "Users can update their own timeline notes" ON public.timeline_notes
    FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own timeline notes" ON public.timeline_notes;
CREATE POLICY "Users can delete their own timeline notes" ON public.timeline_notes
    FOR DELETE USING (auth.uid() = user_id);
