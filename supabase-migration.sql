-- Supabase Migration Script for IB Networking App
-- Run this in Supabase SQL Editor after creating your project

-- Users table (modified for Supabase Auth integration)
CREATE TABLE public.users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    gmail_refresh_token TEXT,
    gmail_access_token TEXT,
    gmail_address VARCHAR(255),
    name VARCHAR(255),
    -- Resume storage (stored as BYTEA for now, can migrate to Supabase Storage later)
    resume_filename VARCHAR(255),
    resume_data BYTEA,
    resume_mimetype VARCHAR(100),
    resume_storage_path TEXT, -- Path in Supabase Storage (for future use)
    resume_uploaded_at TIMESTAMPTZ,
    -- Signature fields
    signature_text TEXT,
    signature_html TEXT,
    signature_updated_at TIMESTAMPTZ,
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Templates table
CREATE TABLE public.templates (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    subject TEXT NOT NULL,
    body TEXT NOT NULL,
    category VARCHAR(100) DEFAULT 'general',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Contacts table
CREATE TABLE public.contacts (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    linkedin VARCHAR(500),
    company VARCHAR(255),
    position VARCHAR(255),
    group_affiliation VARCHAR(255),
    timeline TEXT,
    notes TEXT,
    status VARCHAR(50) DEFAULT 'not_contacted',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Sent emails table
CREATE TABLE public.sent_emails (
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

-- Create indexes for performance
CREATE INDEX idx_templates_user_id ON public.templates(user_id);
CREATE INDEX idx_contacts_user_id ON public.contacts(user_id);
CREATE INDEX idx_contacts_status ON public.contacts(status);
CREATE INDEX idx_sent_emails_user_id ON public.sent_emails(user_id);
CREATE INDEX idx_sent_emails_sent_at ON public.sent_emails(sent_at DESC);

-- Enable Row Level Security (RLS) - IMPORTANT for multi-tenant security
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sent_emails ENABLE ROW LEVEL SECURITY;

-- RLS Policies - Users can only access their own data
CREATE POLICY "Users can view own data" ON public.users
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own data" ON public.users
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can view own templates" ON public.templates
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can view own contacts" ON public.contacts
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can view own sent emails" ON public.sent_emails
    FOR ALL USING (auth.uid() = user_id);

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger for templates
CREATE TRIGGER update_templates_updated_at BEFORE UPDATE ON public.templates
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Trigger for contacts
CREATE TRIGGER update_contacts_updated_at BEFORE UPDATE ON public.contacts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
