-- Migration: 004_mailgun_ids_and_uuid_fix.sql
-- Description: Add Mailgun identifiers and ensure UUID consistency
-- Date: 2025-09-16
-- Author: do-Mails System

-- Ensure pgcrypto extension is available for gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Add columns for Mailgun identifiers to avoid misusing domains.id
ALTER TABLE domains
  ADD COLUMN IF NOT EXISTS mailgun_domain_id TEXT,
  ADD COLUMN IF NOT EXISTS mailgun_inbound_route_id TEXT,
  ADD COLUMN IF NOT EXISTS mailgun_webhooks JSONB DEFAULT '{}';

-- Add indexes for the new Mailgun identifier columns
CREATE INDEX IF NOT EXISTS idx_domains_mailgun_domain_id ON domains(mailgun_domain_id) WHERE mailgun_domain_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_domains_mailgun_route_id ON domains(mailgun_inbound_route_id) WHERE mailgun_inbound_route_id IS NOT NULL;

-- Add comments to document the purpose of these columns
COMMENT ON COLUMN domains.mailgun_domain_id IS 'Mailgun-specific domain identifier for API operations';
COMMENT ON COLUMN domains.mailgun_inbound_route_id IS 'Mailgun route ID for catch-all email routing';
COMMENT ON COLUMN domains.mailgun_webhooks IS 'JSON object tracking configured webhooks for this domain';

-- Ensure all domains have proper verification tokens
UPDATE domains 
SET verification_token = encode(gen_random_bytes(32), 'hex')
WHERE verification_token IS NULL OR verification_token = '';

-- Add constraint to ensure verification_token is never empty
ALTER TABLE domains 
  ADD CONSTRAINT domains_verification_token_not_empty 
  CHECK (verification_token IS NOT NULL AND length(verification_token) > 0);