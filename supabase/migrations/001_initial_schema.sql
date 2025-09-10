-- Migration: 001_initial_schema.sql
-- Description: Create initial database schema for do-Mails email alias system
-- Date: 2025-09-10
-- Author: do-Mails System

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create domains table
CREATE TABLE domains (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  domain_name TEXT NOT NULL UNIQUE,
  verification_status TEXT NOT NULL CHECK (verification_status IN ('pending', 'verified', 'failed')),
  verification_token TEXT NOT NULL UNIQUE,
  verified_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create email_aliases table
CREATE TABLE email_aliases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  domain_id UUID NOT NULL REFERENCES domains(id) ON DELETE CASCADE,
  alias_name TEXT NOT NULL,
  is_enabled BOOLEAN NOT NULL DEFAULT true,
  last_email_received_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(domain_id, alias_name)
);

-- Add computed column for full_address (will be added after domains table exists)
-- Note: We'll use a function instead of generated column for better compatibility
CREATE OR REPLACE FUNCTION get_full_address(alias_name TEXT, domain_id UUID)
RETURNS TEXT AS $$
BEGIN
  RETURN alias_name || '@' || (SELECT domain_name FROM domains WHERE id = domain_id);
END;
$$ LANGUAGE plpgsql STABLE;

-- Create email_threads table
CREATE TABLE email_threads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  alias_id UUID NOT NULL REFERENCES email_aliases(id) ON DELETE CASCADE,
  subject TEXT NOT NULL,
  participants TEXT[] NOT NULL,
  message_count INTEGER NOT NULL DEFAULT 0,
  last_message_at TIMESTAMP WITH TIME ZONE NOT NULL,
  is_archived BOOLEAN NOT NULL DEFAULT false,
  labels TEXT[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create email_messages table
CREATE TABLE email_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id UUID NOT NULL REFERENCES email_threads(id) ON DELETE CASCADE,
  alias_id UUID NOT NULL REFERENCES email_aliases(id) ON DELETE CASCADE,
  message_id TEXT NOT NULL UNIQUE,
  in_reply_to TEXT,
  reference TEXT[],
  from_address TEXT NOT NULL,
  to_addresses TEXT[] NOT NULL,
  cc_addresses TEXT[] DEFAULT '{}',
  bcc_addresses TEXT[] DEFAULT '{}',
  subject TEXT NOT NULL,
  body_text TEXT,
  body_html TEXT,
  is_read BOOLEAN NOT NULL DEFAULT false,
  is_sent BOOLEAN NOT NULL DEFAULT false,
  mailgun_message_id TEXT,
  received_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create email_attachments table
CREATE TABLE email_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES email_messages(id) ON DELETE CASCADE,
  filename TEXT NOT NULL,
  content_type TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  storage_path TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create email_signatures table
CREATE TABLE email_signatures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  alias_id UUID NOT NULL REFERENCES email_aliases(id) ON DELETE CASCADE,
  signature_html TEXT NOT NULL,
  signature_text TEXT NOT NULL,
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(alias_id)
);

-- Create forwarding_rules table
CREATE TABLE forwarding_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  alias_id UUID NOT NULL REFERENCES email_aliases(id) ON DELETE CASCADE,
  forward_to_email TEXT NOT NULL,
  is_enabled BOOLEAN NOT NULL DEFAULT true,
  keep_copy BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create trigger function for updating updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at columns
CREATE TRIGGER update_domains_updated_at
  BEFORE UPDATE ON domains
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_email_aliases_updated_at
  BEFORE UPDATE ON email_aliases
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_email_threads_updated_at
  BEFORE UPDATE ON email_threads
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_email_signatures_updated_at
  BEFORE UPDATE ON email_signatures
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_forwarding_rules_updated_at
  BEFORE UPDATE ON forwarding_rules
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Create function to update thread message count and last_message_at
CREATE OR REPLACE FUNCTION update_thread_stats()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE email_threads 
    SET 
      message_count = message_count + 1,
      last_message_at = NEW.received_at,
      updated_at = NOW()
    WHERE id = NEW.thread_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE email_threads 
    SET 
      message_count = message_count - 1,
      updated_at = NOW()
    WHERE id = OLD.thread_id;
    
    -- Update last_message_at to the most recent remaining message
    UPDATE email_threads 
    SET last_message_at = (
      SELECT MAX(received_at) 
      FROM email_messages 
      WHERE thread_id = OLD.thread_id
    )
    WHERE id = OLD.thread_id;
    
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for thread stats
CREATE TRIGGER update_thread_stats_trigger
  AFTER INSERT OR DELETE ON email_messages
  FOR EACH ROW
  EXECUTE FUNCTION update_thread_stats();

-- Create function to update alias last_email_received_at
CREATE OR REPLACE FUNCTION update_alias_last_received()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.is_sent = false THEN
    UPDATE email_aliases 
    SET 
      last_email_received_at = NEW.received_at,
      updated_at = NOW()
    WHERE id = NEW.alias_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for alias last received
CREATE TRIGGER update_alias_last_received_trigger
  AFTER INSERT ON email_messages
  FOR EACH ROW
  EXECUTE FUNCTION update_alias_last_received();
