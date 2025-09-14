# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## What This Repository Is

do-Mails is a privacy-focused email alias management system built with Next.js 14. It allows users to create unlimited email aliases under custom domains and manage emails in a unified Gmail-like interface. The system handles both inbound and outbound email processing through Mailgun integration, with complete user data isolation via Supabase Row-Level Security (RLS).

Key capabilities:
- **Domain Management**: DNS verification and custom domain setup
- **Email Aliases**: Unlimited alias creation with automatic/manual generation  
- **Unified Inbox**: Gmail-style threading and email management
- **Privacy Protection**: Reply from alias addresses to maintain anonymity
- **Multi-User**: Complete tenant isolation with RLS policies

## Quickstart (5-Command Setup)

```bash
# 1. Install dependencies
npm install

# 2. Build workspace libraries
npm run build:libs

# 3. Copy environment template (then configure .env.local)
cp .env.example .env.local

# 4. Start development server
npm run dev

# 5. Run tests to verify setup
npm run test:all
```

**Additional Setup Required:**
- Configure Supabase project and run migrations
- Set up Mailgun account and domain
- Configure environment variables in `.env.local`
- See full setup guide in SETUP.md

## Environment and Prerequisites

### Toolchain Requirements
- **Node.js**: 18+ (prefer Node 20 LTS)
- **Package Manager**: npm (uses npm workspaces)
- **Database**: Supabase project with CLI installed
- **Email Service**: Mailgun account with domain configured
- **Testing**: Playwright browsers installed

### Environment Variables

Create `.env.local` from `.env.example`:

```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Mailgun Configuration  
MAILGUN_API_KEY=key-your-api-key
MAILGUN_DOMAIN=mg.yourdomain.com
MAILGUN_WEBHOOK_SIGNING_KEY=your-webhook-key

# Application
APP_BASE_URL=http://localhost:3000
NODE_ENV=development
```

### One-Time Setup Commands

```bash
# Install Supabase CLI globally
npm install -g supabase

# Install Playwright browsers
npx playwright install

# Start local Supabase (optional for development)
supabase start

# Link to your Supabase project
supabase link --project-ref your-project-id

# Push migrations to database
supabase db push
```

## Monorepo and Workspaces

The project uses **npm workspaces** (not Turborepo/Nx) with the following structure:

```
├── src/                          # Next.js 14 App Router application
├── libs/                         # Workspace libraries
│   ├── alias-management/         # Business logic for domains/aliases
│   ├── domain-verification/      # DNS verification and checks
│   └── email-processing/         # Email parsing, threading, MIME handling
├── tests/                        # Multi-layer test suite
│   ├── unit/                     # Jest unit tests
│   ├── contract/                 # Vitest API contract tests
│   ├── integration/              # Vitest integration tests
│   └── e2e/                      # Playwright end-to-end tests
└── supabase/                     # Database migrations and config
```

### Working with Workspace Libraries

Each library in `libs/` is a standalone npm package with CLI capabilities:

```bash
# Build all libraries
npm run build:libs

# Watch libraries during development
npm run dev:libs

# Clean library builds
npm run clean:libs

# Work with individual libraries
npm run build --workspace=@do-mails/email-processing
npm run test --workspace=@do-mails/alias-management

# Library CLIs (after building)
./libs/email-processing/dist/cli.js --help
./libs/domain-verification/dist/cli.js --help
./libs/alias-management/dist/cli.js --help
```

### TypeScript Path Aliases

Libraries are imported using path aliases configured in `tsconfig.json`:

```typescript
import { processEmail } from '@do-mails/email-processing'
import { verifyDomain } from '@do-mails/domain-verification' 
import { createAlias } from '@do-mails/alias-management'
```

## Architecture Overview

### Next.js 14 App Router Structure

```
src/app/
├── api/                          # API Route Handlers
│   ├── aliases/                  # Alias CRUD operations
│   ├── domains/                  # Domain management & verification
│   ├── emails/                   # Email operations (send, threads, messages)
│   └── webhooks/mailgun/         # Inbound email webhook processing
├── auth/                         # Authentication pages
├── dashboard/                    # Main application UI
│   ├── aliases/                  # Alias management interface
│   ├── domains/                  # Domain setup and verification
│   ├── emails/                   # Email inbox and threading
│   └── settings/                 # User configuration
└── globals.css                   # Tailwind CSS styles
```

### Data Flow Patterns

**Inbound Email Processing:**
1. Mailgun receives email → sends webhook to `/api/webhooks/mailgun`
2. Webhook validates signature using `MAILGUN_WEBHOOK_SIGNING_KEY`
3. `@do-mails/email-processing` parses MIME, extracts attachments
4. `@do-mails/alias-management` determines routing rules
5. Email stored in Supabase with proper threading and RLS

**Outbound Email Sending:**
1. UI triggers send via `/api/emails/send` 
2. `@do-mails/alias-management` validates permissions and alias ownership
3. Email sent through Mailgun API preserving alias as sender
4. Message stored in thread with `is_sent: true` flag

### State Management

- **TanStack Query**: Server state, caching, background updates
- **Zustand**: Client-side UI state (modals, selections, filters)
- **Jotai**: Atomic state for complex form interactions

### Component Architecture

- **shadcn/ui + Radix**: Accessible component primitives
- **Tailwind CSS**: Utility-first styling with dark/light theme support
- **React Server Components**: Used for initial page loads and data fetching
- **Client Components**: Interactive UI with 'use client' directive

## Development Workflows

### Adding a New API Route

1. Create route handler in `src/app/api/{feature}/route.ts`:
```typescript
import { NextRequest } from 'next/server'
import { createSupabaseServer } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  const supabase = createSupabaseServer()
  // Validate auth, input, call library, return response
}
```

2. Add corresponding library function if needed
3. Write contract tests in `tests/contract/`
4. Update API types in `src/types/`

### Database Schema Changes

1. Create migration in `supabase/migrations/`:
```sql
-- Migration: 20240101000000_add_email_signatures.sql
CREATE TABLE email_signatures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  -- Add RLS policies
);
```

2. Apply locally: `supabase db reset`
3. Generate types: `supabase gen types typescript --local > src/types/database.ts`
4. Update RLS policies and test with different user contexts

### Adding UI Components

1. Install via shadcn: `npx shadcn-ui@latest add dialog`
2. Components go in `src/components/ui/`
3. Follow existing patterns for theming and accessibility
4. Wire to Radix primitives for behavior

### Extending Workspace Libraries

1. Define framework-agnostic business logic
2. Export clean TypeScript interfaces
3. Add CLI commands if applicable (see existing `bin` entries)
4. Update library `package.json` exports
5. Rebuild: `npm run build:libs`

### Local Email Testing

1. Start development server: `npm run dev`
2. Expose locally: `ngrok http 3000` 
3. Configure Mailgun route to `{ngrok-url}/api/webhooks/mailgun`
4. Send test email to configured Mailgun domain
5. Verify processing in Next.js logs and Supabase tables

## Testing Strategy and Commands

### Unit Tests (Jest)
Scope: Pure functions, utilities, React components
```bash
npm run test              # Run once
npm run test:watch        # Watch mode
npm test -- --coverage   # With coverage
```

### Contract Tests (Vitest) 
Scope: API route handlers, input validation
```bash
npm run test:contract     # API endpoint contracts
npm run test:integration  # Cross-library integration
npm run test:vitest       # All Vitest tests
```

### End-to-End Tests (Playwright)
Scope: Full user workflows across browser
```bash
npm run test:e2e                    # All E2E tests
npx playwright test --headed       # With browser visible
npx playwright test --debug        # Debug mode
npx playwright show-report         # View test report
```

### Test Data Management

- **Database**: Each test suite resets Supabase test schema
- **Email**: Mailgun sandbox mode or webhook replay fixtures
- **Authentication**: Test users created via Supabase auth

### All Tests Command
```bash
npm run test:all          # Jest + Vitest (unit + contract + integration)
```

## Command Reference (Cheatsheet)

### Development
```bash
npm install               # Install all dependencies
npm run dev              # Start dev server (builds libs first)
npm run build            # Production build
npm start                # Start production server
npm run type-check       # TypeScript validation
npm run lint             # ESLint
```

### Workspace Libraries
```bash
npm run build:libs       # Build all workspace libraries
npm run dev:libs         # Watch all libraries for changes
npm run clean:libs       # Clean library dist folders

# Individual library operations
npm run build --workspace=@do-mails/email-processing
npm run test --workspace=@do-mails/domain-verification
```

### Database (Supabase)
```bash
supabase start           # Start local Supabase stack
supabase stop            # Stop local stack  
supabase status          # Check service status
supabase db reset        # Reset local DB with migrations
supabase studio          # Open database studio
supabase db push         # Push migrations to remote
supabase gen types typescript --local > src/types/database.ts
```

### Testing
```bash
npm run test             # Jest unit tests
npm run test:watch       # Jest watch mode
npm run test:contract    # Vitest contract tests
npm run test:integration # Vitest integration tests
npm run test:e2e         # Playwright E2E tests
npm run test:all         # Run all test suites
```

### Library CLIs (after `npm run build:libs`)
```bash
# Email processing utilities
./libs/email-processing/dist/cli.js parse-eml ./email.eml
./libs/email-processing/dist/cli.js extract-attachments ./email.eml

# Domain verification checks  
./libs/domain-verification/dist/cli.js check-mx example.com
./libs/domain-verification/dist/cli.js verify-spf example.com

# Alias management operations
./libs/alias-management/dist/cli.js create-alias user@domain.com
./libs/alias-management/dist/cli.js list-aliases --domain=example.com
```

## Troubleshooting and Diagnostics

### Supabase Connection Issues
```bash
# Check local Supabase status
supabase status

# Verify environment variables
echo $NEXT_PUBLIC_SUPABASE_URL
echo $NEXT_PUBLIC_SUPABASE_ANON_KEY

# Reset local database
supabase db reset

# Check RLS policies in Supabase Studio
supabase studio
```

### RLS/Authentication Errors
- Verify user session in browser dev tools (localStorage)
- Check service role key usage (server-only operations)
- Validate RLS policies allow the operation
- Test with different user contexts

### Mailgun Webhook Issues
```bash
# Verify webhook signature validation
curl -X POST http://localhost:3000/api/webhooks/mailgun \
  -H "Content-Type: application/json" \
  -d '{"signature": {"token": "test", "timestamp": "123", "signature": "hash"}}'

# Check Mailgun environment variables
echo $MAILGUN_WEBHOOK_SIGNING_KEY
echo $MAILGUN_API_KEY

# View webhook logs in Mailgun dashboard
```

### Email Delivery Problems  
- Verify DNS records: MX, SPF, DKIM in domain registrar
- Check Mailgun domain verification status
- Review Mailgun delivery logs for bounces/failures
- Ensure not in Mailgun sandbox mode for production

### Next.js Development Issues
```bash
# Clear Next.js cache
rm -rf .next

# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install

# Type check for errors
npm run type-check

# Check for missing library builds
npm run build:libs
```

### Playwright Test Flakiness
- Increase timeouts in `playwright.config.ts`
- Enable trace collection: `trace: 'on'`
- Run in headed mode to debug: `--headed`
- Check for timing issues with async operations

## WARP Usage Guidance and Safety Rails

### Safe Practices for WARP AI
- **Always verify package manager**: Confirm `npm` usage (this repo uses npm workspaces)
- **Environment isolation**: Use `.env.local` for development, `.env.test.local` for testing
- **Read-only first**: Run diagnostic commands before making changes
- **Workspace awareness**: Remember to build libs after changes (`npm run build:libs`)

### Recommended WARP Prompts
- "Build the workspace libraries and start development"
- "Run all tests and show me any failures"
- "Check Supabase connection and database status"
- "Help me debug this Mailgun webhook issue"
- "Create a new API route for [feature]"

### Do Not Do List
- ❌ Never run production database operations (`supabase db reset` on prod)
- ❌ Never commit `.env.local` or other env files with secrets
- ❌ Don't bypass TypeScript errors in production builds
- ❌ Avoid force-pushing to main branch
- ❌ Don't modify generated migration files after creation

### Suggested Terminal Layout
For active development, use split terminals:
1. **Main**: `npm run dev` (Next.js dev server) 
2. **Logs**: `supabase logs` or Mailgun webhook monitoring
3. **Testing**: `npm run test:watch` 
4. **Tunnel**: `ngrok http 3000` for webhook testing

## Glossary and References

### Domain Terms
- **Alias**: Email address that forwards to user's real email
- **Domain**: Custom domain verified for alias creation
- **Inbound/Outbound**: Email direction (receiving vs sending)
- **RLS**: Row-Level Security (Supabase data isolation)
- **Service Role**: Admin-level Supabase key (server-only)
- **Webhook**: HTTP callback from Mailgun for inbound emails
- **DKIM/SPF/MX**: DNS records for email authentication and routing

### Key Files and Directories
- `src/app/api/webhooks/mailgun/route.ts` - Inbound email processing
- `src/lib/supabase/client.ts` - Database types and client setup
- `libs/email-processing/src/` - Email parsing and threading logic
- `supabase/migrations/` - Database schema changes
- `tests/contract/` - API endpoint validation tests
- `.env.example` - Environment variable template

### External Documentation
- [Next.js App Router](https://nextjs.org/docs/app)
- [Supabase Auth & RLS](https://supabase.com/docs/guides/auth/row-level-security)
- [Mailgun Webhooks](https://documentation.mailgun.com/en/latest/user_manual.html#webhooks)
- [shadcn/ui Components](https://ui.shadcn.com/)
- [TanStack Query](https://tanstack.com/query/latest)
- [Playwright Testing](https://playwright.dev/)

### Internal Documentation
- `README.md` - Project overview and basic setup
- `SETUP.md` - Detailed environment configuration guide
- `AUGGIE.md` - Spec-driven development methodology
- `libs/*/README.md` - Individual library documentation
