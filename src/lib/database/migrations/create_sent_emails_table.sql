-- Migration: Create sent_emails table for tracking outbound emails
-- PRIORITY 3: Reply functionality database support

-- Create sent_emails table
CREATE TABLE IF NOT EXISTS sent_emails (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  domain_id UUID NOT NULL REFERENCES domains(id) ON DELETE CASCADE,
  from_address TEXT NOT NULL,
  to_addresses TEXT[] NOT NULL,
  cc_addresses TEXT[],
  bcc_addresses TEXT[],
  subject TEXT NOT NULL,
  content TEXT NOT NULL,
  is_html BOOLEAN DEFAULT false,
  message_id TEXT,
  in_reply_to TEXT,
  references TEXT,
  status TEXT DEFAULT 'sent' CHECK (status IN ('sent', 'delivered', 'failed', 'bounced')),
  sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  delivered_at TIMESTAMP WITH TIME ZONE,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_sent_emails_domain_id ON sent_emails(domain_id);
CREATE INDEX IF NOT EXISTS idx_sent_emails_from_address ON sent_emails(from_address);
CREATE INDEX IF NOT EXISTS idx_sent_emails_sent_at ON sent_emails(sent_at DESC);
CREATE INDEX IF NOT EXISTS idx_sent_emails_message_id ON sent_emails(message_id);
CREATE INDEX IF NOT EXISTS idx_sent_emails_status ON sent_emails(status);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_sent_emails_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_sent_emails_updated_at
  BEFORE UPDATE ON sent_emails
  FOR EACH ROW
  EXECUTE FUNCTION update_sent_emails_updated_at();

-- Add RLS (Row Level Security) policies
ALTER TABLE sent_emails ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see sent emails from their own domains
CREATE POLICY "Users can view their own sent emails" ON sent_emails
  FOR SELECT
  USING (
    domain_id IN (
      SELECT id FROM domains WHERE user_id = auth.uid()
    )
  );

-- Policy: Users can insert sent emails for their own domains
CREATE POLICY "Users can insert sent emails for their domains" ON sent_emails
  FOR INSERT
  WITH CHECK (
    domain_id IN (
      SELECT id FROM domains WHERE user_id = auth.uid()
    )
  );

-- Policy: Users can update sent emails for their own domains
CREATE POLICY "Users can update their own sent emails" ON sent_emails
  FOR UPDATE
  USING (
    domain_id IN (
      SELECT id FROM domains WHERE user_id = auth.uid()
    )
  );

-- Add comment
COMMENT ON TABLE sent_emails IS 'Tracks outbound emails sent through custom domains for reply functionality';
