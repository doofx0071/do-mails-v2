# Database Migration Instructions

## Option 1: Using Supabase CLI (Recommended)

### Prerequisites
1. Install Supabase CLI:
```bash
npm install -g supabase
```

2. Link to your Supabase project:
```bash
supabase link --project-ref YOUR_PROJECT_REF
```

### Run Migrations
```bash
# Apply all pending migrations
supabase db push

# Or apply migrations one by one
supabase migration up
```

## Option 2: Manual SQL Execution (If CLI doesn't work)

### Steps:
1. Go to your Supabase Dashboard
2. Navigate to SQL Editor
3. Copy and paste the contents of each migration file in order:

#### Migration 1: Initial Schema
Copy and execute: `supabase/migrations/001_initial_schema.sql`

#### Migration 2: RLS Policies  
Copy and execute: `supabase/migrations/002_rls_policies.sql`

#### Migration 3: Indexes
Copy and execute: `supabase/migrations/003_indexes.sql`

## Option 3: Combined Migration File

If you prefer to run everything at once, here's the complete SQL:

### Step 1: Copy this SQL and run it in Supabase SQL Editor

```sql
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

-- Create email_threads table
CREATE TABLE email_threads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  alias_id UUID NOT NULL REFERENCES email_aliases(id) ON DELETE CASCADE,
  subject TEXT NOT NULL,
  participants TEXT[] NOT NULL,
  message_count INTEGER NOT NULL DEFAULT 0,
  last_message_at TIMESTAMP WITH TIME ZONE NOT NULL,
  is_archived BOOLEAN NOT NULL DEFAULT false,
  labels TEXT[] NOT NULL DEFAULT '{}',
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
  references TEXT[] NOT NULL DEFAULT '{}',
  from_address TEXT NOT NULL,
  to_addresses TEXT[] NOT NULL,
  cc_addresses TEXT[] NOT NULL DEFAULT '{}',
  bcc_addresses TEXT[] NOT NULL DEFAULT '{}',
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
  size INTEGER NOT NULL,
  storage_path TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE domains ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_aliases ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_attachments ENABLE ROW LEVEL SECURITY;

-- RLS Policies for domains
CREATE POLICY "Users can manage own domains" ON domains FOR ALL USING (auth.uid() = user_id);

-- RLS Policies for email_aliases
CREATE POLICY "Users can manage own aliases" ON email_aliases FOR ALL USING (
  EXISTS (SELECT 1 FROM domains WHERE domains.id = email_aliases.domain_id AND domains.user_id = auth.uid())
);

-- RLS Policies for email_threads
CREATE POLICY "Users can manage own threads" ON email_threads FOR ALL USING (
  EXISTS (
    SELECT 1 FROM email_aliases 
    JOIN domains ON domains.id = email_aliases.domain_id 
    WHERE email_aliases.id = email_threads.alias_id AND domains.user_id = auth.uid()
  )
);

-- RLS Policies for email_messages
CREATE POLICY "Users can manage own messages" ON email_messages FOR ALL USING (
  EXISTS (
    SELECT 1 FROM email_aliases 
    JOIN domains ON domains.id = email_aliases.domain_id 
    WHERE email_aliases.id = email_messages.alias_id AND domains.user_id = auth.uid()
  )
);

-- RLS Policies for email_attachments
CREATE POLICY "Users can manage own attachments" ON email_attachments FOR ALL USING (
  EXISTS (
    SELECT 1 FROM email_messages 
    JOIN email_aliases ON email_aliases.id = email_messages.alias_id
    JOIN domains ON domains.id = email_aliases.domain_id 
    WHERE email_messages.id = email_attachments.message_id AND domains.user_id = auth.uid()
  )
);

-- Create indexes for performance
CREATE INDEX idx_domains_user_id ON domains(user_id);
CREATE INDEX idx_domains_verification_status ON domains(verification_status);
CREATE INDEX idx_email_aliases_domain_id ON email_aliases(domain_id);
CREATE INDEX idx_email_aliases_is_enabled ON email_aliases(is_enabled);
CREATE INDEX idx_email_threads_alias_id ON email_threads(alias_id);
CREATE INDEX idx_email_threads_is_archived ON email_threads(is_archived);
CREATE INDEX idx_email_threads_last_message_at ON email_threads(last_message_at DESC);
CREATE INDEX idx_email_messages_thread_id ON email_messages(thread_id);
CREATE INDEX idx_email_messages_alias_id ON email_messages(alias_id);
CREATE INDEX idx_email_messages_is_read ON email_messages(is_read);
CREATE INDEX idx_email_messages_received_at ON email_messages(received_at DESC);
CREATE INDEX idx_email_attachments_message_id ON email_attachments(message_id);
```

## Verification

After running the migration, verify the tables were created:

```sql
-- Check if all tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('domains', 'email_aliases', 'email_threads', 'email_messages', 'email_attachments');

-- Check RLS is enabled
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('domains', 'email_aliases', 'email_threads', 'email_messages', 'email_attachments');
```

## Next Steps

After successful migration:
1. Test API endpoints
2. Create missing UI components
3. Run the application
