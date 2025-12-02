-- Migration 003: Add gmail_message_id to sent_emails table for sync tracking
-- This allows us to track which Gmail emails we've already synced

ALTER TABLE sent_emails
ADD COLUMN IF NOT EXISTS gmail_message_id TEXT UNIQUE;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_sent_emails_gmail_message_id ON sent_emails(gmail_message_id);

-- Add comment
COMMENT ON COLUMN sent_emails.gmail_message_id IS 'Gmail message ID for synced emails to prevent duplicates';
