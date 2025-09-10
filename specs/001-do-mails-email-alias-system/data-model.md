# Data Model: do-Mails Email Alias System

**Date**: 2025-09-10  
**Phase**: 1 - Design & Contracts  
**Database**: Supabase PostgreSQL with Row-Level Security

## Entity Definitions

### 1. User (Managed by Supabase Auth)
**Purpose**: User authentication and identification
**Source**: Supabase `auth.users` table (built-in)
**Key Fields**:
- `id`: UUID (primary key)
- `email`: TEXT (user's real email address)
- `created_at`: TIMESTAMP

### 2. Domain
**Purpose**: Custom domains owned by users for email alias creation
**Table**: `domains`

```sql
CREATE TABLE domains (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  domain_name TEXT NOT NULL UNIQUE,
  verification_status TEXT NOT NULL CHECK (verification_status IN ('pending', 'verified', 'failed')),
  verification_token TEXT NOT NULL,
  verified_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS Policy
CREATE POLICY "Users can only access own domains" ON domains
  FOR ALL USING (auth.uid() = user_id);

-- Indexes
CREATE INDEX idx_domains_user_id ON domains(user_id);
CREATE INDEX idx_domains_verification_status ON domains(verification_status);
```

**Validation Rules**:
- Domain name must be valid DNS format
- Verification token must be unique
- Only one domain per domain_name allowed

### 3. Email Alias
**Purpose**: Email addresses created under verified domains
**Table**: `email_aliases`

```sql
CREATE TABLE email_aliases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  domain_id UUID NOT NULL REFERENCES domains(id) ON DELETE CASCADE,
  alias_name TEXT NOT NULL, -- Part before @ symbol
  full_address TEXT NOT NULL GENERATED ALWAYS AS (alias_name || '@' || (SELECT domain_name FROM domains WHERE id = domain_id)) STORED,
  is_enabled BOOLEAN NOT NULL DEFAULT true,
  last_email_received_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(domain_id, alias_name)
);

-- RLS Policy
CREATE POLICY "Users can only access own aliases" ON email_aliases
  FOR ALL USING (auth.uid() = (SELECT user_id FROM domains WHERE id = domain_id));

-- Indexes
CREATE INDEX idx_email_aliases_domain_id ON email_aliases(domain_id);
CREATE INDEX idx_email_aliases_full_address ON email_aliases(full_address);
CREATE INDEX idx_email_aliases_enabled ON email_aliases(is_enabled);
```

**Validation Rules**:
- Alias name must be valid email local part
- Full address must be unique across system
- Can only create aliases on verified domains

### 4. Email Thread
**Purpose**: Conversation grouping for related emails
**Table**: `email_threads`

```sql
CREATE TABLE email_threads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  alias_id UUID NOT NULL REFERENCES email_aliases(id) ON DELETE CASCADE,
  subject TEXT NOT NULL,
  participants TEXT[] NOT NULL, -- Array of email addresses
  message_count INTEGER NOT NULL DEFAULT 0,
  last_message_at TIMESTAMP WITH TIME ZONE NOT NULL,
  is_archived BOOLEAN NOT NULL DEFAULT false,
  labels TEXT[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS Policy
CREATE POLICY "Users can only access own threads" ON email_threads
  FOR ALL USING (auth.uid() = (
    SELECT d.user_id FROM domains d 
    JOIN email_aliases ea ON d.id = ea.domain_id 
    WHERE ea.id = alias_id
  ));

-- Indexes
CREATE INDEX idx_email_threads_alias_id ON email_threads(alias_id);
CREATE INDEX idx_email_threads_last_message ON email_threads(last_message_at DESC);
CREATE INDEX idx_email_threads_archived ON email_threads(is_archived);
CREATE INDEX idx_email_threads_labels ON email_threads USING GIN(labels);
```

### 5. Email Message
**Purpose**: Individual email messages within threads
**Table**: `email_messages`

```sql
CREATE TABLE email_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id UUID NOT NULL REFERENCES email_threads(id) ON DELETE CASCADE,
  alias_id UUID NOT NULL REFERENCES email_aliases(id) ON DELETE CASCADE,
  message_id TEXT NOT NULL UNIQUE, -- Email Message-ID header
  in_reply_to TEXT, -- In-Reply-To header
  references TEXT[], -- References header parsed
  from_address TEXT NOT NULL,
  to_addresses TEXT[] NOT NULL,
  cc_addresses TEXT[] DEFAULT '{}',
  bcc_addresses TEXT[] DEFAULT '{}',
  subject TEXT NOT NULL,
  body_text TEXT,
  body_html TEXT,
  is_read BOOLEAN NOT NULL DEFAULT false,
  is_sent BOOLEAN NOT NULL DEFAULT false, -- true for outbound emails
  mailgun_message_id TEXT, -- Mailgun's message ID for tracking
  received_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS Policy
CREATE POLICY "Users can only access own messages" ON email_messages
  FOR ALL USING (auth.uid() = (
    SELECT d.user_id FROM domains d 
    JOIN email_aliases ea ON d.id = ea.domain_id 
    WHERE ea.id = alias_id
  ));

-- Indexes
CREATE INDEX idx_email_messages_thread_id ON email_messages(thread_id);
CREATE INDEX idx_email_messages_alias_id ON email_messages(alias_id);
CREATE INDEX idx_email_messages_message_id ON email_messages(message_id);
CREATE INDEX idx_email_messages_received_at ON email_messages(received_at DESC);
CREATE INDEX idx_email_messages_is_read ON email_messages(is_read);
```

### 6. Email Attachment
**Purpose**: File attachments associated with email messages
**Table**: `email_attachments`

```sql
CREATE TABLE email_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES email_messages(id) ON DELETE CASCADE,
  filename TEXT NOT NULL,
  content_type TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  storage_path TEXT NOT NULL, -- Path in Supabase Storage
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS Policy
CREATE POLICY "Users can only access own attachments" ON email_attachments
  FOR ALL USING (auth.uid() = (
    SELECT d.user_id FROM domains d 
    JOIN email_aliases ea ON d.id = ea.domain_id 
    JOIN email_messages em ON ea.id = em.alias_id
    WHERE em.id = message_id
  ));

-- Indexes
CREATE INDEX idx_email_attachments_message_id ON email_attachments(message_id);
```

### 7. Email Signature
**Purpose**: Custom signatures for each email alias
**Table**: `email_signatures`

```sql
CREATE TABLE email_signatures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  alias_id UUID NOT NULL REFERENCES email_aliases(id) ON DELETE CASCADE,
  signature_html TEXT NOT NULL,
  signature_text TEXT NOT NULL,
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(alias_id) -- One signature per alias
);

-- RLS Policy
CREATE POLICY "Users can only access own signatures" ON email_signatures
  FOR ALL USING (auth.uid() = (
    SELECT d.user_id FROM domains d 
    JOIN email_aliases ea ON d.id = ea.domain_id 
    WHERE ea.id = alias_id
  ));

-- Indexes
CREATE INDEX idx_email_signatures_alias_id ON email_signatures(alias_id);
```

### 8. Forwarding Rule
**Purpose**: Automatic email forwarding configuration
**Table**: `forwarding_rules`

```sql
CREATE TABLE forwarding_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  alias_id UUID NOT NULL REFERENCES email_aliases(id) ON DELETE CASCADE,
  forward_to_email TEXT NOT NULL,
  is_enabled BOOLEAN NOT NULL DEFAULT true,
  keep_copy BOOLEAN NOT NULL DEFAULT true, -- Keep copy in do-Mails inbox
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS Policy
CREATE POLICY "Users can only access own forwarding rules" ON forwarding_rules
  FOR ALL USING (auth.uid() = (
    SELECT d.user_id FROM domains d 
    JOIN email_aliases ea ON d.id = ea.domain_id 
    WHERE ea.id = alias_id
  ));

-- Indexes
CREATE INDEX idx_forwarding_rules_alias_id ON forwarding_rules(alias_id);
CREATE INDEX idx_forwarding_rules_enabled ON forwarding_rules(is_enabled);
```

## Entity Relationships

```
User (auth.users)
  ├── Domain (1:many)
      ├── EmailAlias (1:many)
          ├── EmailThread (1:many)
          │   └── EmailMessage (1:many)
          │       └── EmailAttachment (1:many)
          ├── EmailSignature (1:1)
          └── ForwardingRule (1:many)
```

## State Transitions

### Domain Verification Flow
1. **pending** → **verified** (DNS verification successful)
2. **pending** → **failed** (DNS verification failed after timeout)
3. **failed** → **pending** (user retries verification)

### Email Message Flow
1. **received** → **read** (user opens email)
2. **composed** → **sent** (outbound email sent via Mailgun)

### Email Alias Status
1. **enabled** → **disabled** (user disables alias)
2. **disabled** → **enabled** (user re-enables alias)

## Performance Optimizations

### Database Indexes
- Composite indexes on frequently queried combinations
- GIN indexes for array fields (labels, participants)
- Partial indexes for boolean filters (is_read, is_enabled)

### Query Patterns
- Use thread-based queries to minimize database calls
- Implement pagination for large email lists
- Cache domain verification status to avoid repeated DNS checks

### Storage Considerations
- Email attachments stored in Supabase Storage with CDN
- Large email bodies compressed in database
- Implement email archiving for old messages

## Data Validation Rules

### Domain Names
- Must match DNS domain format: `^[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9]?\.[a-zA-Z]{2,}$`
- Cannot be reserved domains (localhost, example.com, etc.)

### Email Aliases
- Local part must match: `^[a-zA-Z0-9._%+-]+$`
- Maximum 64 characters for local part
- Full address maximum 254 characters

### Email Addresses
- Must pass RFC 5322 validation
- Support international domain names (IDN)

### File Attachments
- Maximum 25MB per attachment
- Virus scanning via Supabase Storage
- Allowed MIME types configurable per user

This data model provides the foundation for all email alias management functionality while ensuring data isolation and performance through proper indexing and RLS policies.
