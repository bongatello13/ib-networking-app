-- Migration 002: Add Companies and Enhanced Contact Tracking
-- Run this in Supabase SQL Editor to add spreadsheet replacement features

-- ==================== COMPANIES TABLE ====================
CREATE TABLE public.companies (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    ranking VARCHAR(50) CHECK (ranking IN ('Heavy Target', 'Target', 'Lower Priority')),
    industry VARCHAR(255),
    sector VARCHAR(255),
    results_progress TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==================== UPDATE CONTACTS TABLE ====================
-- Add new columns to existing contacts table
ALTER TABLE public.contacts
    ADD COLUMN company_id INTEGER REFERENCES public.companies(id) ON DELETE SET NULL,
    ADD COLUMN phone VARCHAR(50),
    ADD COLUMN tags TEXT[], -- Array of tags (divisions, sources, custom)
    ADD COLUMN email_date TIMESTAMPTZ,
    ADD COLUMN phone_date TIMESTAMPTZ,
    ADD COLUMN last_contact_date TIMESTAMPTZ,
    ADD COLUMN next_followup_date TIMESTAMPTZ,
    ADD COLUMN quality VARCHAR(20) CHECK (quality IN ('good', 'okay', 'poor')),
    ADD COLUMN email_history JSONB; -- Store Gmail thread data

-- Update status column to use new values (migrate existing data)
ALTER TABLE public.contacts
    DROP CONSTRAINT IF EXISTS contacts_status_check;

ALTER TABLE public.contacts
    ADD CONSTRAINT contacts_status_check
    CHECK (status IN ('none', 'emailed', 'called', 'not_contacted'));

-- Migrate old status values to new ones
UPDATE public.contacts
    SET status = 'none'
    WHERE status = 'not_contacted';

-- Now remove 'not_contacted' from allowed values
ALTER TABLE public.contacts
    DROP CONSTRAINT contacts_status_check;

ALTER TABLE public.contacts
    ADD CONSTRAINT contacts_status_check
    CHECK (status IN ('none', 'emailed', 'called'));

-- Set default to 'none'
ALTER TABLE public.contacts
    ALTER COLUMN status SET DEFAULT 'none';

-- ==================== TIMELINE NOTES TABLE ====================
CREATE TABLE public.timeline_notes (
    id SERIAL PRIMARY KEY,
    contact_id INTEGER NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    type VARCHAR(20) CHECK (type IN ('email', 'call', 'meeting', 'general')),
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==================== INDEXES ====================
CREATE INDEX idx_companies_user_id ON public.companies(user_id);
CREATE INDEX idx_companies_ranking ON public.companies(ranking);
CREATE INDEX idx_contacts_company_id ON public.contacts(company_id);
CREATE INDEX idx_contacts_status_new ON public.contacts(status);
CREATE INDEX idx_contacts_quality ON public.contacts(quality);
CREATE INDEX idx_contacts_tags ON public.contacts USING GIN(tags);
CREATE INDEX idx_contacts_next_followup ON public.contacts(next_followup_date);
CREATE INDEX idx_timeline_notes_contact_id ON public.timeline_notes(contact_id);
CREATE INDEX idx_timeline_notes_user_id ON public.timeline_notes(user_id);
CREATE INDEX idx_timeline_notes_created_at ON public.timeline_notes(created_at DESC);

-- ==================== ROW LEVEL SECURITY ====================
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.timeline_notes ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own companies" ON public.companies
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can view own timeline notes" ON public.timeline_notes
    FOR ALL USING (auth.uid() = user_id);

-- ==================== TRIGGERS ====================
-- Auto-update updated_at for companies
CREATE TRIGGER update_companies_updated_at BEFORE UPDATE ON public.companies
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ==================== HELPER FUNCTIONS ====================

-- Function to auto-update contact status and dates when email is sent
CREATE OR REPLACE FUNCTION auto_update_contact_on_email()
RETURNS TRIGGER AS $$
BEGIN
    -- Update the contact's status and email_date when an email is sent
    UPDATE public.contacts
    SET
        status = CASE
            WHEN status = 'none' THEN 'emailed'
            ELSE status
        END,
        email_date = COALESCE(email_date, NEW.sent_at),
        last_contact_date = NEW.sent_at,
        updated_at = NOW()
    WHERE email = NEW.recipient;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update contact when email is sent
CREATE TRIGGER update_contact_on_email_sent
    AFTER INSERT ON public.sent_emails
    FOR EACH ROW
    EXECUTE FUNCTION auto_update_contact_on_email();

-- Function to auto-create timeline note when email is sent
CREATE OR REPLACE FUNCTION create_timeline_note_on_email()
RETURNS TRIGGER AS $$
DECLARE
    contact_record RECORD;
BEGIN
    -- Find the contact by email
    SELECT id, user_id INTO contact_record
    FROM public.contacts
    WHERE email = NEW.recipient
    LIMIT 1;

    -- If contact exists, create a timeline note
    IF contact_record.id IS NOT NULL THEN
        INSERT INTO public.timeline_notes (contact_id, user_id, type, content)
        VALUES (
            contact_record.id,
            contact_record.user_id,
            'email',
            'Email sent: "' || NEW.subject || '"'
        );
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to create timeline note when email is sent
CREATE TRIGGER create_note_on_email_sent
    AFTER INSERT ON public.sent_emails
    FOR EACH ROW
    EXECUTE FUNCTION create_timeline_note_on_email();

-- ==================== SAMPLE DATA (Optional - for testing) ====================
-- Uncomment to add sample companies for testing

-- INSERT INTO public.companies (user_id, name, ranking, industry) VALUES
--     ((SELECT id FROM public.users LIMIT 1), 'Moelis & Company', 'Heavy Target', 'Investment Banking'),
--     ((SELECT id FROM public.users LIMIT 1), 'Guggenheim Partners', 'Heavy Target', 'Investment Banking'),
--     ((SELECT id FROM public.users LIMIT 1), 'Bank of America', 'Target', 'Investment Banking'),
--     ((SELECT id FROM public.users LIMIT 1), 'Goldman Sachs', 'Heavy Target', 'Investment Banking');
