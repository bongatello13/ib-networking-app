-- Migration 004: Add email and call notes fields to contacts
-- This adds separate fields for email and call communication notes

ALTER TABLE public.contacts
    ADD COLUMN IF NOT EXISTS email_notes TEXT,
    ADD COLUMN IF NOT EXISTS call_notes TEXT;

-- Update the comments for clarity
COMMENT ON COLUMN public.contacts.notes IS 'General notes about the person';
COMMENT ON COLUMN public.contacts.email_notes IS 'Notes specific to email communications';
COMMENT ON COLUMN public.contacts.call_notes IS 'Notes specific to phone calls';
