# Research: do-Mails Technical Implementation

**Date**: 2025-09-10  
**Phase**: 0 - Research & Technology Validation  
**Status**: Complete

## Research Tasks Completed

### 1. Mailgun Webhook Configuration and Domain Routing

**Decision**: Use Mailgun's Routes API with catch-all patterns for custom domains
**Rationale**: 
- Mailgun Routes allow dynamic email routing without pre-configuring each alias
- Catch-all patterns (*.domain.com) automatically route all emails to our webhook
- Supports unlimited aliases per domain without Mailgun configuration changes
- Built-in spam filtering and email parsing

**Implementation Approach**:
- Configure Mailgun route: `match_recipient(".*@{domain}")` → webhook URL
- Webhook receives parsed email data (headers, body, attachments)
- Extract recipient alias from email headers for database lookup
- Process inbound emails asynchronously via Next.js API routes

**Alternatives Considered**:
- SendGrid: More expensive, less flexible routing
- AWS SES: Requires more complex setup for custom domains
- Direct SMTP: Would require managing mail server infrastructure

### 2. Supabase RLS Patterns for Multi-Tenant Email Data

**Decision**: User-scoped RLS policies with UUID-based tenant isolation
**Rationale**:
- Supabase RLS provides database-level security enforcement
- User ID from auth.users() automatically available in policies
- Prevents data leakage even with application bugs
- Supports complex queries while maintaining isolation

**RLS Policy Patterns**:
```sql
-- Domains: Users can only access their own domains
CREATE POLICY "Users can only access own domains" ON domains
  FOR ALL USING (auth.uid() = user_id);

-- Email Aliases: Access through domain ownership
CREATE POLICY "Users can only access own aliases" ON email_aliases
  FOR ALL USING (auth.uid() = (SELECT user_id FROM domains WHERE id = domain_id));

-- Email Messages: Access through alias ownership
CREATE POLICY "Users can only access own emails" ON email_messages
  FOR ALL USING (auth.uid() = (SELECT d.user_id FROM domains d 
    JOIN email_aliases ea ON d.id = ea.domain_id 
    WHERE ea.id = alias_id));
```

**Alternatives Considered**:
- Application-level filtering: Less secure, prone to bugs
- Separate databases per user: Too complex, expensive
- Traditional RBAC: Overkill for single-tenant-per-user model

### 3. DNS TXT Record Verification in Node.js

**Decision**: Use Node.js built-in `dns.promises.resolveTxt()` with retry logic
**Rationale**:
- Built-in Node.js DNS module, no external dependencies
- Supports async/await patterns
- Reliable across different DNS providers
- Can implement custom retry logic for DNS propagation delays

**Implementation Approach**:
```typescript
import { resolveTxt } from 'dns/promises';

async function verifyDomainOwnership(domain: string, expectedToken: string): Promise<boolean> {
  try {
    const records = await resolveTxt(`_domails-verify.${domain}`);
    return records.flat().includes(expectedToken);
  } catch (error) {
    return false; // DNS record not found or domain doesn't exist
  }
}
```

**Verification Flow**:
1. Generate unique verification token for domain
2. Instruct user to create TXT record: `_domails-verify.domain.com` = `token`
3. Poll DNS every 30 seconds for up to 10 minutes
4. Mark domain as verified when token found

**Alternatives Considered**:
- Third-party DNS libraries: Unnecessary complexity
- HTTP-based verification: Less secure, requires web server access
- Email-based verification: Circular dependency (need email to verify email domain)

### 4. Email Threading Algorithm for Conversation Grouping

**Decision**: Gmail-style threading using Message-ID and References headers
**Rationale**:
- Industry standard approach used by Gmail, Outlook
- Leverages existing email headers for reliable threading
- Handles complex conversation trees (replies, forwards, etc.)
- Maintains thread integrity across different email clients

**Threading Algorithm**:
1. Extract Message-ID, In-Reply-To, and References headers
2. Create thread if no existing thread found for any referenced message IDs
3. Add message to existing thread if any header matches existing thread
4. Update thread metadata (last message time, participant count)
5. Handle edge cases (missing headers, malformed references)

**Database Schema**:
```sql
CREATE TABLE email_threads (
  id UUID PRIMARY KEY,
  subject TEXT NOT NULL,
  participants TEXT[] NOT NULL,
  last_message_at TIMESTAMP WITH TIME ZONE NOT NULL,
  message_count INTEGER DEFAULT 1
);

CREATE TABLE email_messages (
  id UUID PRIMARY KEY,
  thread_id UUID REFERENCES email_threads(id),
  message_id TEXT UNIQUE NOT NULL, -- Email Message-ID header
  references TEXT[], -- References and In-Reply-To headers
  -- ... other fields
);
```

**Alternatives Considered**:
- Subject-based threading: Unreliable, breaks with subject changes
- Time-based grouping: Doesn't handle delayed replies correctly
- Manual user threading: Too much user effort required

### 5. shadcn/ui Mail Components Integration

**Decision**: Use shadcn/ui mail example as base with TanStack Query integration
**Rationale**:
- shadcn/ui provides Gmail-style mail components out of the box
- Components are customizable and built with Tailwind CSS
- TanStack Query handles data fetching, caching, and real-time updates
- Proven patterns for email interface development

**Component Architecture**:
- `MailList`: Displays email threads with virtual scrolling
- `MailDisplay`: Shows individual email content with threading
- `MailCompose`: Rich text editor for composing emails
- `MailSidebar`: Navigation and folder/label management

**TanStack Query Integration**:
```typescript
// Email threads query with real-time updates
const { data: threads } = useQuery({
  queryKey: ['email-threads', filters],
  queryFn: () => fetchEmailThreads(filters),
  refetchInterval: 30000, // Poll for new emails
});

// Optimistic updates for email actions
const archiveEmailMutation = useMutation({
  mutationFn: archiveEmail,
  onMutate: async (emailId) => {
    // Optimistically update UI
    await queryClient.cancelQueries(['email-threads']);
    // ... optimistic update logic
  },
});
```

**Alternatives Considered**:
- Custom email components: Too much development time
- Third-party email libraries: Less customizable, potential licensing issues
- SWR instead of TanStack Query: Less powerful caching and mutation features

## Technology Stack Validation

### Core Stack Confirmed
- **Frontend**: Next.js 14 with App Router, TypeScript, Tailwind CSS
- **Backend**: Next.js API routes with Supabase integration
- **Database**: Supabase PostgreSQL with Row-Level Security
- **Authentication**: Supabase Auth with email/password
- **Email Processing**: Mailgun API for sending/receiving
- **File Storage**: Supabase Storage for email attachments
- **State Management**: TanStack Query + Zustand for complex state
- **UI Components**: shadcn/ui with custom email components
- **Testing**: Jest + React Testing Library + Playwright
- **Deployment**: Vercel for Next.js, Supabase managed services

### Performance Considerations
- **Database Indexing**: Composite indexes on user_id + timestamp for email queries
- **Caching Strategy**: TanStack Query for client-side, Supabase built-in caching
- **Real-time Updates**: Supabase Realtime for new email notifications
- **File Handling**: Supabase Storage with CDN for attachment delivery
- **Email Processing**: Async webhook processing to avoid timeout issues

### Security Measures
- **Data Isolation**: Supabase RLS policies enforce user-level access control
- **Input Validation**: Zod schemas for all API inputs and database operations
- **Email Security**: Mailgun's built-in spam filtering and virus scanning
- **File Security**: Supabase Storage with access policies and virus scanning
- **Authentication**: Supabase Auth with secure session management

## Research Conclusions

All technical unknowns have been resolved with specific implementation approaches identified. The chosen technology stack provides:

1. **Scalability**: Supabase handles database scaling, Vercel handles application scaling
2. **Security**: Database-level RLS ensures data isolation, Mailgun provides email security
3. **Developer Experience**: TypeScript throughout, modern React patterns, comprehensive testing
4. **User Experience**: Gmail-familiar interface, real-time updates, fast performance
5. **Maintainability**: Well-documented libraries, standard patterns, clear separation of concerns

**Ready for Phase 1**: Design & Contracts
