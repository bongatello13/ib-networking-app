-- Create scheduled_emails table
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

-- Create index for efficient querying
CREATE INDEX idx_scheduled_emails_user_id ON scheduled_emails(user_id);
CREATE INDEX idx_scheduled_emails_scheduled_for ON scheduled_emails(scheduled_for);
CREATE INDEX idx_scheduled_emails_status ON scheduled_emails(status);

-- Enable RLS
ALTER TABLE scheduled_emails ENABLE ROW LEVEL SECURITY;

-- Create RLS policy
CREATE POLICY scheduled_emails_user_isolation ON scheduled_emails
  FOR ALL
  USING (auth.uid() = user_id);

-- Add comment
COMMENT ON TABLE scheduled_emails IS 'Stores emails scheduled to be sent at a future date/time';
