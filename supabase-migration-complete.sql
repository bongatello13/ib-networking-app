-- ============================================
-- COMPLETE Supabase Migration Script for IB Networking App
-- ============================================
-- This migration includes:
-- 1. Core tables (users, templates, contacts, sent_emails)
-- 2. CRM features (companies, timeline_notes, updated contacts)
-- 3. Calendar features (events, Google Calendar sync)
--
-- Run this in Supabase SQL Editor
-- ============================================

-- ============================================
-- USERS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    name VARCHAR(255),

    -- Gmail/Google OAuth
    gmail_refresh_token TEXT,
    gmail_access_token TEXT,
    gmail_address VARCHAR(255),

    -- Google Calendar settings
    google_calendar_sync_enabled BOOLEAN DEFAULT FALSE,
    recruiting_calendar_id TEXT, -- ID of dedicated "[Name]'s Recruiting Calendar" in Google Calendar

    -- Resume storage
    resume_filename VARCHAR(255),
    resume_data BYTEA,
    resume_mimetype VARCHAR(100),
    resume_storage_path TEXT,
    resume_uploaded_at TIMESTAMPTZ,

    -- Email signature
    signature_text TEXT,
    signature_html TEXT,
    signature_updated_at TIMESTAMPTZ,

    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- COMPANIES TABLE (CRM Feature)
-- ============================================
CREATE TABLE IF NOT EXISTS public.companies (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,

    -- Company details
    name TEXT NOT NULL,
    ranking TEXT DEFAULT 'Target' CHECK (ranking IN ('Heavy Target', 'Target', 'Lower Priority')),
    industry TEXT,
    sector TEXT,
    results_progress TEXT,
    notes TEXT,

    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- CONTACTS TABLE (Enhanced)
-- ============================================
CREATE TABLE IF NOT EXISTS public.contacts (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    company_id INTEGER REFERENCES public.companies(id) ON DELETE SET NULL,

    -- Basic contact info
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    phone VARCHAR(50),
    linkedin VARCHAR(500),
    company VARCHAR(255), -- Fallback if no company_id
    position VARCHAR(255),

    -- Legacy fields (keep for backward compatibility)
    group_affiliation VARCHAR(255),
    timeline TEXT,
    notes TEXT,

    -- CRM fields
    status TEXT DEFAULT 'none' CHECK (status IN ('none', 'emailed', 'called')),
    quality TEXT CHECK (quality IN ('good', 'okay', 'poor')),
    tags TEXT[], -- Array of tag strings

    -- Date tracking
    email_date TIMESTAMPTZ,
    phone_date TIMESTAMPTZ,
    last_contact_date TIMESTAMPTZ,
    next_followup_date TIMESTAMPTZ,

    -- Email history (Gmail thread data)
    email_history JSONB,

    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- TIMELINE NOTES TABLE (CRM Feature)
-- ============================================
CREATE TABLE IF NOT EXISTS public.timeline_notes (
    id SERIAL PRIMARY KEY,
    contact_id INTEGER NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,

    -- Note details
    type TEXT DEFAULT 'general' CHECK (type IN ('email', 'call', 'meeting', 'general')),
    content TEXT NOT NULL,

    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- EVENTS TABLE (Calendar Feature)
-- ============================================
CREATE TABLE IF NOT EXISTS public.events (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    company_id INTEGER REFERENCES public.companies(id) ON DELETE SET NULL,
    contact_id INTEGER REFERENCES public.contacts(id) ON DELETE SET NULL,

    -- Event details
    title TEXT NOT NULL,
    description TEXT,
    event_type TEXT DEFAULT 'other' CHECK (event_type IN (
        'networking_event',
        'coffee_chat',
        'phone_call',
        'info_session',
        'interview',
        'deadline',
        'other'
    )),

    -- Time and location
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ NOT NULL,
    location TEXT,

    -- Google Calendar sync
    google_calendar_id TEXT,
    google_calendar_link TEXT,
    synced_to_google BOOLEAN DEFAULT FALSE,

    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- TEMPLATES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.templates (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    subject TEXT NOT NULL,
    body TEXT NOT NULL,
    category VARCHAR(100) DEFAULT 'general',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- SENT EMAILS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.sent_emails (
    id SERIAL PRIMARY KEY,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    template_id INTEGER REFERENCES public.templates(id) ON DELETE SET NULL,
    recipient VARCHAR(255) NOT NULL,
    subject TEXT NOT NULL,
    body TEXT NOT NULL,
    variables_used JSONB,
    has_attachment BOOLEAN DEFAULT false,
    sent_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- INDEXES FOR PERFORMANCE
-- ============================================

-- Users
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);

-- Companies
CREATE INDEX IF NOT EXISTS idx_companies_user_id ON public.companies(user_id);
CREATE INDEX IF NOT EXISTS idx_companies_ranking ON public.companies(ranking);

-- Contacts
CREATE INDEX IF NOT EXISTS idx_contacts_user_id ON public.contacts(user_id);
CREATE INDEX IF NOT EXISTS idx_contacts_company_id ON public.contacts(company_id);
CREATE INDEX IF NOT EXISTS idx_contacts_status ON public.contacts(status);
CREATE INDEX IF NOT EXISTS idx_contacts_quality ON public.contacts(quality);
CREATE INDEX IF NOT EXISTS idx_contacts_next_followup ON public.contacts(next_followup_date);
CREATE INDEX IF NOT EXISTS idx_contacts_tags ON public.contacts USING GIN(tags); -- GIN index for array

-- Timeline Notes
CREATE INDEX IF NOT EXISTS idx_timeline_notes_contact_id ON public.timeline_notes(contact_id);
CREATE INDEX IF NOT EXISTS idx_timeline_notes_user_id ON public.timeline_notes(user_id);
CREATE INDEX IF NOT EXISTS idx_timeline_notes_created_at ON public.timeline_notes(created_at DESC);

-- Events
CREATE INDEX IF NOT EXISTS idx_events_user_id ON public.events(user_id);
CREATE INDEX IF NOT EXISTS idx_events_company_id ON public.events(company_id);
CREATE INDEX IF NOT EXISTS idx_events_contact_id ON public.events(contact_id);
CREATE INDEX IF NOT EXISTS idx_events_start_time ON public.events(start_time);
CREATE INDEX IF NOT EXISTS idx_events_event_type ON public.events(event_type);

-- Templates
CREATE INDEX IF NOT EXISTS idx_templates_user_id ON public.templates(user_id);

-- Sent Emails
CREATE INDEX IF NOT EXISTS idx_sent_emails_user_id ON public.sent_emails(user_id);
CREATE INDEX IF NOT EXISTS idx_sent_emails_sent_at ON public.sent_emails(sent_at DESC);

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

-- Enable RLS on all tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.timeline_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sent_emails ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Users can view own data" ON public.users;
DROP POLICY IF EXISTS "Users can update own data" ON public.users;
DROP POLICY IF EXISTS "Users can view own templates" ON public.templates;
DROP POLICY IF EXISTS "Users can view own contacts" ON public.contacts;
DROP POLICY IF EXISTS "Users can view own sent emails" ON public.sent_emails;

-- Users policies
CREATE POLICY "Users can view own data" ON public.users
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own data" ON public.users
    FOR UPDATE USING (auth.uid() = id);

-- Companies policies
CREATE POLICY "Users can manage own companies" ON public.companies
    FOR ALL USING (auth.uid() = user_id);

-- Contacts policies
CREATE POLICY "Users can manage own contacts" ON public.contacts
    FOR ALL USING (auth.uid() = user_id);

-- Timeline notes policies
CREATE POLICY "Users can manage own timeline notes" ON public.timeline_notes
    FOR ALL USING (auth.uid() = user_id);

-- Events policies
CREATE POLICY "Users can manage own events" ON public.events
    FOR ALL USING (auth.uid() = user_id);

-- Templates policies
CREATE POLICY "Users can manage own templates" ON public.templates
    FOR ALL USING (auth.uid() = user_id);

-- Sent emails policies
CREATE POLICY "Users can view own sent emails" ON public.sent_emails
    FOR ALL USING (auth.uid() = user_id);

-- ============================================
-- TRIGGERS
-- ============================================

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply triggers to all tables with updated_at
DROP TRIGGER IF EXISTS update_users_updated_at ON public.users;
CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON public.users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_companies_updated_at ON public.companies;
CREATE TRIGGER update_companies_updated_at
    BEFORE UPDATE ON public.companies
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_contacts_updated_at ON public.contacts;
CREATE TRIGGER update_contacts_updated_at
    BEFORE UPDATE ON public.contacts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_events_updated_at ON public.events;
CREATE TRIGGER update_events_updated_at
    BEFORE UPDATE ON public.events
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_templates_updated_at ON public.templates;
CREATE TRIGGER update_templates_updated_at
    BEFORE UPDATE ON public.templates
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- HELPER VIEWS (Optional - for analytics)
-- ============================================

-- View for upcoming events
CREATE OR REPLACE VIEW upcoming_events AS
SELECT
    e.*,
    c.name as contact_name,
    co.name as company_name
FROM public.events e
LEFT JOIN public.contacts c ON e.contact_id = c.id
LEFT JOIN public.companies co ON e.company_id = co.id
WHERE e.start_time >= NOW()
ORDER BY e.start_time ASC;

-- View for contacts needing follow-up
CREATE OR REPLACE VIEW contacts_needing_followup AS
SELECT
    c.*,
    co.name as company_name,
    co.ranking
FROM public.contacts c
LEFT JOIN public.companies co ON c.company_id = co.id
WHERE c.next_followup_date <= NOW() + INTERVAL '7 days'
  AND c.next_followup_date IS NOT NULL
ORDER BY c.next_followup_date ASC;

-- ============================================
-- MIGRATION COMPLETE
-- ============================================
-- Tables created:
--   ✓ users (with Google Calendar fields)
--   ✓ companies
--   ✓ contacts (enhanced with CRM fields)
--   ✓ timeline_notes
--   ✓ events
--   ✓ templates
--   ✓ sent_emails
--
-- Features enabled:
--   ✓ Row Level Security (RLS)
--   ✓ Automatic updated_at triggers
--   ✓ Performance indexes
--   ✓ Helper views
-- ============================================
