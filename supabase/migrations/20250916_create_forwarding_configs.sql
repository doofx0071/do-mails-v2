-- Create domain_forwarding_configs table for ImprovMX-style forwarding
CREATE TABLE domain_forwarding_configs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  domain VARCHAR(255) UNIQUE NOT NULL,
  forward_to VARCHAR(255) NOT NULL,
  verification_token VARCHAR(255) NOT NULL,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'verified')),
  enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add indexes for better performance
CREATE INDEX idx_domain_forwarding_configs_domain ON domain_forwarding_configs(domain);
CREATE INDEX idx_domain_forwarding_configs_status ON domain_forwarding_configs(status);
CREATE INDEX idx_domain_forwarding_configs_enabled ON domain_forwarding_configs(enabled);

-- Add RLS (Row Level Security) policies
ALTER TABLE domain_forwarding_configs ENABLE ROW LEVEL SECURITY;

-- Policy: Allow all operations for service role (webhooks, etc.)
CREATE POLICY "Service role can manage forwarding configs" ON domain_forwarding_configs
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- Policy: Allow public read access (for public domain listing)
CREATE POLICY "Public read access to forwarding configs" ON domain_forwarding_configs
  FOR SELECT USING (true);

-- Policy: Allow insert for anyone (for ImprovMX-style setup)
CREATE POLICY "Public insert access to forwarding configs" ON domain_forwarding_configs
  FOR INSERT WITH CHECK (true);

-- Policy: Allow authenticated users to manage their own configs (if user_id is added later)
-- This is prepared for future user association
CREATE POLICY "Users can manage their forwarding configs" ON domain_forwarding_configs
  FOR ALL USING (true); -- Temporarily allow all, restrict later when user auth is implemented

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_domain_forwarding_configs_updated_at 
  BEFORE UPDATE ON domain_forwarding_configs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Add comments for documentation
COMMENT ON TABLE domain_forwarding_configs IS 'Stores ImprovMX-style email forwarding configurations for domains';
COMMENT ON COLUMN domain_forwarding_configs.domain IS 'The domain name (e.g., example.com)';
COMMENT ON COLUMN domain_forwarding_configs.forward_to IS 'Email address to forward emails to';
COMMENT ON COLUMN domain_forwarding_configs.verification_token IS 'DNS TXT record token for domain verification';
COMMENT ON COLUMN domain_forwarding_configs.status IS 'Verification status: pending or verified';
COMMENT ON COLUMN domain_forwarding_configs.enabled IS 'Whether forwarding is enabled for this domain';