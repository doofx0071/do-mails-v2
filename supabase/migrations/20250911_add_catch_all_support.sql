-- Migration: Add catch-all email support
-- This migration adds support for receiving emails at any address on a verified domain

-- Add domain_id and recipient_address to email_threads table
ALTER TABLE email_threads 
ADD COLUMN IF NOT EXISTS domain_id UUID REFERENCES domains(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS recipient_address TEXT;

-- Add domain_id and recipient_address to email_messages table  
ALTER TABLE email_messages
ADD COLUMN IF NOT EXISTS domain_id UUID REFERENCES domains(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS recipient_address TEXT;

-- Create index for faster lookups on domain_id and recipient_address
CREATE INDEX IF NOT EXISTS idx_email_threads_domain_recipient 
ON email_threads(domain_id, recipient_address);

CREATE INDEX IF NOT EXISTS idx_email_messages_domain_recipient 
ON email_messages(domain_id, recipient_address);

-- Create index for faster message lookups by domain
CREATE INDEX IF NOT EXISTS idx_email_messages_domain_id 
ON email_messages(domain_id);

-- Update RLS policies for email_threads to work with domain-based access
DROP POLICY IF EXISTS "Users can view their email threads" ON email_threads;
CREATE POLICY "Users can view their email threads" ON email_threads
FOR SELECT USING (
  -- Allow access if user owns the alias (existing functionality)
  (alias_id IN (
    SELECT ea.id FROM email_aliases ea
    JOIN domains d ON ea.domain_id = d.id
    WHERE d.user_id = auth.uid()
  ))
  OR
  -- Allow access if user owns the domain (catch-all functionality)
  (domain_id IN (
    SELECT d.id FROM domains d
    WHERE d.user_id = auth.uid()
  ))
);

DROP POLICY IF EXISTS "Users can insert their email threads" ON email_threads;
CREATE POLICY "Users can insert their email threads" ON email_threads
FOR INSERT WITH CHECK (
  -- Allow insert if user owns the alias (existing functionality)
  (alias_id IN (
    SELECT ea.id FROM email_aliases ea
    JOIN domains d ON ea.domain_id = d.id
    WHERE d.user_id = auth.uid()
  ))
  OR
  -- Allow insert if user owns the domain (catch-all functionality)
  (domain_id IN (
    SELECT d.id FROM domains d
    WHERE d.user_id = auth.uid()
  ))
);

DROP POLICY IF EXISTS "Users can update their email threads" ON email_threads;
CREATE POLICY "Users can update their email threads" ON email_threads
FOR UPDATE USING (
  -- Allow update if user owns the alias (existing functionality)
  (alias_id IN (
    SELECT ea.id FROM email_aliases ea
    JOIN domains d ON ea.domain_id = d.id
    WHERE d.user_id = auth.uid()
  ))
  OR
  -- Allow update if user owns the domain (catch-all functionality)
  (domain_id IN (
    SELECT d.id FROM domains d
    WHERE d.user_id = auth.uid()
  ))
);

-- Update RLS policies for email_messages to work with domain-based access
DROP POLICY IF EXISTS "Users can view their email messages" ON email_messages;
CREATE POLICY "Users can view their email messages" ON email_messages
FOR SELECT USING (
  -- Allow access if user owns the alias (existing functionality)
  (alias_id IN (
    SELECT ea.id FROM email_aliases ea
    JOIN domains d ON ea.domain_id = d.id
    WHERE d.user_id = auth.uid()
  ))
  OR
  -- Allow access if user owns the domain (catch-all functionality)
  (domain_id IN (
    SELECT d.id FROM domains d
    WHERE d.user_id = auth.uid()
  ))
);

DROP POLICY IF EXISTS "Users can insert their email messages" ON email_messages;
CREATE POLICY "Users can insert their email messages" ON email_messages
FOR INSERT WITH CHECK (
  -- Allow insert if user owns the alias (existing functionality)
  (alias_id IN (
    SELECT ea.id FROM email_aliases ea
    JOIN domains d ON ea.domain_id = d.id
    WHERE d.user_id = auth.uid()
  ))
  OR
  -- Allow insert if user owns the domain (catch-all functionality)
  (domain_id IN (
    SELECT d.id FROM domains d
    WHERE d.user_id = auth.uid()
  ))
);

DROP POLICY IF EXISTS "Users can update their email messages" ON email_messages;
CREATE POLICY "Users can update their email messages" ON email_messages
FOR UPDATE USING (
  -- Allow update if user owns the alias (existing functionality)
  (alias_id IN (
    SELECT ea.id FROM email_aliases ea
    JOIN domains d ON ea.domain_id = d.id
    WHERE d.user_id = auth.uid()
  ))
  OR
  -- Allow update if user owns the domain (catch-all functionality)
  (domain_id IN (
    SELECT d.id FROM domains d
    WHERE d.user_id = auth.uid()
  ))
);

-- Add comment explaining the catch-all functionality
COMMENT ON COLUMN email_threads.domain_id IS 'Domain ID for catch-all emails (when no specific alias exists)';
COMMENT ON COLUMN email_threads.recipient_address IS 'Full recipient email address for catch-all emails';
COMMENT ON COLUMN email_messages.domain_id IS 'Domain ID for catch-all emails (when no specific alias exists)';
COMMENT ON COLUMN email_messages.recipient_address IS 'Full recipient email address for catch-all emails';
