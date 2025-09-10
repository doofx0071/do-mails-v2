-- Migration: 002_rls_policies.sql
-- Description: Create Row-Level Security (RLS) policies for multi-tenant data isolation
-- Date: 2025-09-10
-- Author: do-Mails System

-- Enable RLS on all tables
ALTER TABLE domains ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_aliases ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_signatures ENABLE ROW LEVEL SECURITY;
ALTER TABLE forwarding_rules ENABLE ROW LEVEL SECURITY;

-- Create helper function for checking domain ownership
CREATE OR REPLACE FUNCTION user_owns_domain(domain_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM domains
    WHERE id = domain_id AND user_id = COALESCE(auth.uid()::uuid, '00000000-0000-0000-0000-000000000000'::uuid)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create helper function for checking alias ownership
CREATE OR REPLACE FUNCTION user_owns_alias(alias_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM email_aliases ea
    JOIN domains d ON ea.domain_id = d.id
    WHERE ea.id = alias_id AND d.user_id = COALESCE(auth.uid()::uuid, '00000000-0000-0000-0000-000000000000'::uuid)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create helper function for checking message ownership
CREATE OR REPLACE FUNCTION user_owns_message(msg_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM email_messages em
    WHERE em.id = msg_id AND user_owns_alias(em.alias_id)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Domains policies
CREATE POLICY "Users can only access own domains" ON domains
  FOR ALL USING (COALESCE(auth.uid()::uuid, '00000000-0000-0000-0000-000000000000'::uuid) = user_id);

CREATE POLICY "Users can insert own domains" ON domains
  FOR INSERT WITH CHECK (COALESCE(auth.uid()::uuid, '00000000-0000-0000-0000-000000000000'::uuid) = user_id);

CREATE POLICY "Users can update own domains" ON domains
  FOR UPDATE USING (COALESCE(auth.uid()::uuid, '00000000-0000-0000-0000-000000000000'::uuid) = user_id)
  WITH CHECK (COALESCE(auth.uid()::uuid, '00000000-0000-0000-0000-000000000000'::uuid) = user_id);

CREATE POLICY "Users can delete own domains" ON domains
  FOR DELETE USING (COALESCE(auth.uid()::uuid, '00000000-0000-0000-0000-000000000000'::uuid) = user_id);

-- Email aliases policies
CREATE POLICY "Users can only access own aliases" ON email_aliases
  FOR ALL USING (user_owns_domain(domain_id));

CREATE POLICY "Users can insert aliases on own domains" ON email_aliases
  FOR INSERT WITH CHECK (user_owns_domain(domain_id));

CREATE POLICY "Users can update own aliases" ON email_aliases
  FOR UPDATE USING (user_owns_domain(domain_id))
  WITH CHECK (user_owns_domain(domain_id));

CREATE POLICY "Users can delete own aliases" ON email_aliases
  FOR DELETE USING (user_owns_domain(domain_id));

-- Email threads policies
CREATE POLICY "Users can only access own threads" ON email_threads
  FOR ALL USING (user_owns_alias(alias_id));

CREATE POLICY "Users can insert threads for own aliases" ON email_threads
  FOR INSERT WITH CHECK (user_owns_alias(alias_id));

CREATE POLICY "Users can update own threads" ON email_threads
  FOR UPDATE USING (user_owns_alias(alias_id))
  WITH CHECK (user_owns_alias(alias_id));

CREATE POLICY "Users can delete own threads" ON email_threads
  FOR DELETE USING (user_owns_alias(alias_id));

-- Email messages policies
CREATE POLICY "Users can only access own messages" ON email_messages
  FOR ALL USING (user_owns_alias(alias_id));

CREATE POLICY "Users can insert messages for own aliases" ON email_messages
  FOR INSERT WITH CHECK (user_owns_alias(alias_id));

CREATE POLICY "Users can update own messages" ON email_messages
  FOR UPDATE USING (user_owns_alias(alias_id))
  WITH CHECK (user_owns_alias(alias_id));

CREATE POLICY "Users can delete own messages" ON email_messages
  FOR DELETE USING (user_owns_alias(alias_id));

-- Email attachments policies
CREATE POLICY "Users can only access own attachments" ON email_attachments
  FOR ALL USING (user_owns_message(message_id));

CREATE POLICY "Users can insert attachments for own messages" ON email_attachments
  FOR INSERT WITH CHECK (user_owns_message(message_id));

CREATE POLICY "Users can update own attachments" ON email_attachments
  FOR UPDATE USING (user_owns_message(message_id))
  WITH CHECK (user_owns_message(message_id));

CREATE POLICY "Users can delete own attachments" ON email_attachments
  FOR DELETE USING (user_owns_message(message_id));

-- Email signatures policies
CREATE POLICY "Users can only access own signatures" ON email_signatures
  FOR ALL USING (user_owns_alias(alias_id));

CREATE POLICY "Users can insert signatures for own aliases" ON email_signatures
  FOR INSERT WITH CHECK (user_owns_alias(alias_id));

CREATE POLICY "Users can update own signatures" ON email_signatures
  FOR UPDATE USING (user_owns_alias(alias_id))
  WITH CHECK (user_owns_alias(alias_id));

CREATE POLICY "Users can delete own signatures" ON email_signatures
  FOR DELETE USING (user_owns_alias(alias_id));

-- Forwarding rules policies
CREATE POLICY "Users can only access own forwarding rules" ON forwarding_rules
  FOR ALL USING (user_owns_alias(alias_id));

CREATE POLICY "Users can insert forwarding rules for own aliases" ON forwarding_rules
  FOR INSERT WITH CHECK (user_owns_alias(alias_id));

CREATE POLICY "Users can update own forwarding rules" ON forwarding_rules
  FOR UPDATE USING (user_owns_alias(alias_id))
  WITH CHECK (user_owns_alias(alias_id));

CREATE POLICY "Users can delete own forwarding rules" ON forwarding_rules
  FOR DELETE USING (user_owns_alias(alias_id));
