-- Migration: 003_indexes.sql
-- Description: Create database indexes for performance optimization
-- Date: 2025-09-10
-- Author: do-Mails System

-- Domains table indexes
CREATE INDEX IF NOT EXISTS idx_domains_user_id ON domains(user_id);
CREATE INDEX IF NOT EXISTS idx_domains_verification_status ON domains(verification_status);
CREATE INDEX IF NOT EXISTS idx_domains_domain_name ON domains(domain_name);
CREATE INDEX IF NOT EXISTS idx_domains_created_at ON domains(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_domains_user_verified ON domains(user_id, verification_status) WHERE verification_status = 'verified';

-- Email aliases table indexes
CREATE INDEX IF NOT EXISTS idx_email_aliases_domain_id ON email_aliases(domain_id);
CREATE INDEX IF NOT EXISTS idx_email_aliases_enabled ON email_aliases(is_enabled);
CREATE INDEX IF NOT EXISTS idx_email_aliases_created_at ON email_aliases(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_email_aliases_last_received ON email_aliases(last_email_received_at DESC);
CREATE INDEX IF NOT EXISTS idx_email_aliases_domain_enabled ON email_aliases(domain_id, is_enabled) WHERE is_enabled = true;

-- Composite index for full address lookups (using function)
CREATE INDEX IF NOT EXISTS idx_email_aliases_full_address ON email_aliases(alias_name, domain_id);

-- Email threads table indexes
CREATE INDEX IF NOT EXISTS idx_email_threads_alias_id ON email_threads(alias_id);
CREATE INDEX IF NOT EXISTS idx_email_threads_last_message ON email_threads(last_message_at DESC);
CREATE INDEX IF NOT EXISTS idx_email_threads_archived ON email_threads(is_archived);
CREATE INDEX IF NOT EXISTS idx_email_threads_created_at ON email_threads(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_email_threads_message_count ON email_threads(message_count DESC);

-- GIN index for labels array
CREATE INDEX IF NOT EXISTS idx_email_threads_labels ON email_threads USING GIN(labels);

-- GIN index for participants array
CREATE INDEX IF NOT EXISTS idx_email_threads_participants ON email_threads USING GIN(participants);

-- Composite indexes for common queries
CREATE INDEX IF NOT EXISTS idx_email_threads_alias_archived ON email_threads(alias_id, is_archived, last_message_at DESC);
CREATE INDEX IF NOT EXISTS idx_email_threads_alias_unarchived ON email_threads(alias_id, last_message_at DESC) WHERE is_archived = false;

-- Email messages table indexes
CREATE INDEX IF NOT EXISTS idx_email_messages_thread_id ON email_messages(thread_id);
CREATE INDEX IF NOT EXISTS idx_email_messages_alias_id ON email_messages(alias_id);
CREATE INDEX IF NOT EXISTS idx_email_messages_message_id ON email_messages(message_id);
CREATE INDEX IF NOT EXISTS idx_email_messages_received_at ON email_messages(received_at DESC);
CREATE INDEX IF NOT EXISTS idx_email_messages_is_read ON email_messages(is_read);
CREATE INDEX IF NOT EXISTS idx_email_messages_is_sent ON email_messages(is_sent);
CREATE INDEX IF NOT EXISTS idx_email_messages_from_address ON email_messages(from_address);
CREATE INDEX IF NOT EXISTS idx_email_messages_mailgun_id ON email_messages(mailgun_message_id);

-- GIN indexes for array fields
CREATE INDEX IF NOT EXISTS idx_email_messages_to_addresses ON email_messages USING GIN(to_addresses);
CREATE INDEX IF NOT EXISTS idx_email_messages_cc_addresses ON email_messages USING GIN(cc_addresses);
-- Fix for reserved keyword 'references' - use quoted identifier for the column name 'reference'
CREATE INDEX IF NOT EXISTS idx_email_messages_references ON email_messages USING GIN("reference");

-- Full-text search indexes
CREATE INDEX IF NOT EXISTS idx_email_messages_subject_fts ON email_messages USING GIN(to_tsvector('english', subject));
CREATE INDEX IF NOT EXISTS idx_email_messages_body_text_fts ON email_messages USING GIN(to_tsvector('english', body_text));

-- Composite indexes for common queries
CREATE INDEX IF NOT EXISTS idx_email_messages_thread_received ON email_messages(thread_id, received_at DESC);
CREATE INDEX IF NOT EXISTS idx_email_messages_alias_received ON email_messages(alias_id, received_at DESC);
CREATE INDEX IF NOT EXISTS idx_email_messages_alias_unread ON email_messages(alias_id, is_read, received_at DESC) WHERE is_read = false;
CREATE INDEX IF NOT EXISTS idx_email_messages_thread_unread ON email_messages(thread_id, is_read) WHERE is_read = false;

-- Email attachments table indexes
CREATE INDEX IF NOT EXISTS idx_email_attachments_message_id ON email_attachments(message_id);
CREATE INDEX IF NOT EXISTS idx_email_attachments_filename ON email_attachments(filename);
CREATE INDEX IF NOT EXISTS idx_email_attachments_content_type ON email_attachments(content_type);
CREATE INDEX IF NOT EXISTS idx_email_attachments_file_size ON email_attachments(file_size DESC);
CREATE INDEX IF NOT EXISTS idx_email_attachments_created_at ON email_attachments(created_at DESC);

-- Email signatures table indexes
CREATE INDEX IF NOT EXISTS idx_email_signatures_alias_id ON email_signatures(alias_id);
CREATE INDEX IF NOT EXISTS idx_email_signatures_is_default ON email_signatures(is_default) WHERE is_default = true;
CREATE INDEX IF NOT EXISTS idx_email_signatures_created_at ON email_signatures(created_at DESC);

-- Forwarding rules table indexes
CREATE INDEX IF NOT EXISTS idx_forwarding_rules_alias_id ON forwarding_rules(alias_id);
CREATE INDEX IF NOT EXISTS idx_forwarding_rules_enabled ON forwarding_rules(is_enabled);
CREATE INDEX IF NOT EXISTS idx_forwarding_rules_forward_to ON forwarding_rules(forward_to_email);
CREATE INDEX IF NOT EXISTS idx_forwarding_rules_alias_enabled ON forwarding_rules(alias_id, is_enabled) WHERE is_enabled = true;

-- Performance optimization indexes for RLS policies
-- These help speed up the complex joins in RLS policies

-- Index to speed up domain ownership checks
CREATE INDEX IF NOT EXISTS idx_domains_user_id_hash ON domains USING HASH(user_id);

-- Index to speed up alias ownership checks through domains
-- Note: Simplified version without complex WHERE clause for better compatibility
CREATE INDEX IF NOT EXISTS idx_email_aliases_domain_user ON email_aliases(domain_id, id);

-- Partial indexes for active/enabled records only
CREATE INDEX IF NOT EXISTS idx_domains_active ON domains(user_id, created_at DESC) 
  WHERE verification_status = 'verified';

CREATE INDEX IF NOT EXISTS idx_aliases_active ON email_aliases(domain_id, created_at DESC) 
  WHERE is_enabled = true;

CREATE INDEX IF NOT EXISTS idx_threads_active ON email_threads(alias_id, last_message_at DESC) 
  WHERE is_archived = false;

-- Indexes for search and filtering
CREATE INDEX IF NOT EXISTS idx_email_messages_search_combo ON email_messages(alias_id, received_at DESC, is_read);

-- Index for email threading (reply chains)
CREATE INDEX IF NOT EXISTS idx_email_messages_in_reply_to ON email_messages(in_reply_to) WHERE in_reply_to IS NOT NULL;

-- Index for webhook processing (Mailgun message tracking)
CREATE INDEX IF NOT EXISTS idx_email_messages_mailgun_processing ON email_messages(mailgun_message_id, received_at) 
  WHERE mailgun_message_id IS NOT NULL;

-- Statistics and maintenance
-- Update table statistics for better query planning
ANALYZE domains;
ANALYZE email_aliases;
ANALYZE email_threads;
ANALYZE email_messages;
ANALYZE email_attachments;
ANALYZE email_signatures;
ANALYZE forwarding_rules;

-- Create a view for commonly accessed data to improve performance
CREATE OR REPLACE VIEW email_threads_with_details AS
SELECT 
  et.*,
  ea.alias_name,
  ea.is_enabled as alias_enabled,
  d.domain_name,
  d.user_id,
  get_full_address(ea.alias_name, ea.domain_id) as full_address,
  (SELECT COUNT(*) FROM email_messages em WHERE em.thread_id = et.id AND em.is_read = false) as unread_count
FROM email_threads et
JOIN email_aliases ea ON et.alias_id = ea.id
JOIN domains d ON ea.domain_id = d.id;

-- Create a view for inbox queries
CREATE OR REPLACE VIEW inbox_threads AS
SELECT 
  etd.*
FROM email_threads_with_details etd
WHERE etd.is_archived = false
ORDER BY etd.last_message_at DESC;

-- Create a view for message details with thread info
CREATE OR REPLACE VIEW email_messages_with_context AS
SELECT 
  em.*,
  et.subject as thread_subject,
  et.participants,
  ea.alias_name,
  d.domain_name,
  get_full_address(ea.alias_name, ea.domain_id) as recipient_address
FROM email_messages em
JOIN email_threads et ON em.thread_id = et.id
JOIN email_aliases ea ON em.alias_id = ea.id
JOIN domains d ON ea.domain_id = d.id;
