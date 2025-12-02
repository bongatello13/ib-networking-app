-- Create scheduled_emails table (only if it doesn't exist)
CREATE TABLE IF NOT EXISTS scheduled_emails (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  to_email TEXT NOT NULL,
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  scheduled_for TIMESTAMP WITH TIME ZONE NOT NULL,
  template_id INTEGER REFERENCES templates(id) ON DELETE SET NULL,
  variables JSONB,
  attach_resume BOOLEAN DEFAULT FALSE,
  include_signature BOOLEAN DEFAULT TRUE,
  contact_id INTEGER REFERENCES contacts(id) ON DELETE SET NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed', 'cancelled', 'sending')),
  sent_at TIMESTAMP WITH TIME ZONE,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes (only if they don't exist)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_scheduled_emails_user_id') THEN
    CREATE INDEX idx_scheduled_emails_user_id ON scheduled_emails(user_id);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_scheduled_emails_scheduled_for') THEN
    CREATE INDEX idx_scheduled_emails_scheduled_for ON scheduled_emails(scheduled_for);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_scheduled_emails_status') THEN
    CREATE INDEX idx_scheduled_emails_status ON scheduled_emails(status);
  END IF;
END $$;

-- Enable RLS
ALTER TABLE scheduled_emails ENABLE ROW LEVEL SECURITY;

-- Drop existing policy if it exists, then create new one
DROP POLICY IF EXISTS scheduled_emails_user_isolation ON scheduled_emails;

CREATE POLICY scheduled_emails_user_isolation ON scheduled_emails
  FOR ALL
  USING (auth.uid() = user_id);

-- Add comment
COMMENT ON TABLE scheduled_emails IS 'Stores emails scheduled to be sent at a future date/time';
