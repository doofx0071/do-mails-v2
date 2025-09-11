# do-Mails - Email Alias Management System

A privacy-focused email alias and inbox management system that allows users to create unlimited email aliases under their custom domains and manage emails in a unified Gmail-like interface.

## Features

- **Domain Management**: Add and verify custom domains with DNS verification
- **Email Aliases**: Create unlimited aliases with manual or automatic generation
- **Unified Inbox**: Gmail-style interface for managing all emails
- **Privacy First**: Reply from alias addresses to maintain privacy
- **Email Threading**: Conversation grouping like Gmail
- **Search & Organization**: Labels, folders, and powerful search
- **Multi-User**: Complete data isolation between users

## Tech Stack

- **Frontend**: Next.js 14 with TypeScript and App Router
- **Backend**: Next.js API routes with Supabase
- **Database**: Supabase PostgreSQL with Row-Level Security
- **Authentication**: Supabase Auth
- **Email**: Mailgun API for sending/receiving
- **UI**: Tailwind CSS with shadcn/ui components
- **State Management**: TanStack Query + Zustand
- **Testing**: Jest, React Testing Library, Playwright

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn
- Supabase account
- Mailgun account
- Custom domain for testing

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd do-mails-v2
```

2. Install dependencies:
```bash
npm install
```

3. Build workspace libraries:
```bash
npm run build:libs
```

4. Copy environment variables:
```bash
cp .env.example .env.local
```

5. Configure your environment variables in `.env.local` (see [Environment Setup](#environment-setup))

6. Run the development server:
```bash
npm run dev
```

7. Open [http://localhost:3000](http://localhost:3000) in your browser

## Environment Setup

### Required Services

Before running the application, you need to set up the following services:

#### 1. Supabase Setup

1. Create a new project at [supabase.com](https://supabase.com)
2. Go to Settings > API to get your keys
3. Run the database migrations:
   ```bash
   # Install Supabase CLI if not already installed
   npm install -g supabase

   # Link to your project
   supabase link --project-ref your-project-id

   # Run migrations
   supabase db push
   ```

#### 2. Mailgun Setup

1. Create account at [mailgun.com](https://mailgun.com)
2. Add and verify your domain
3. Configure DNS records (MX, TXT, CNAME)
4. Get API keys from Settings > API Keys
5. Set up webhooks pointing to your application

#### 3. Domain Configuration

For testing, you'll need a domain where you can:
- Add DNS records (for Mailgun setup)
- Create subdomains for email aliases
- Configure MX records to point to Mailgun

### Environment Variables

Copy `.env.example` to `.env.local` and configure:

```bash
# Required - Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Required - Mailgun Configuration
MAILGUN_API_KEY=key-your-api-key
MAILGUN_DOMAIN=mg.yourdomain.com
MAILGUN_WEBHOOK_SIGNING_KEY=your-webhook-key

# Required - Application
APP_BASE_URL=http://localhost:3000
NODE_ENV=development
```

### Security Notes

⚠️ **Important Security Considerations:**

1. **Never commit `.env.local`** - It contains sensitive keys
2. **Service Role Key** - Only use for admin operations, never expose to client
3. **Separate environments** - Use different keys for dev/staging/production
4. **Key rotation** - Regularly rotate API keys and secrets
5. **HTTPS in production** - Always use HTTPS for production deployments
6. **Webhook security** - Verify Mailgun webhook signatures

### Development Workflow

```bash
# Start development with all services
npm run dev

# Run tests (requires environment setup)
npm run test:all

# Type checking
npm run type-check

# Build libraries after changes
npm run build:libs
```

## Development

### Project Structure

```
src/
├── app/                 # Next.js 14 App Router
├── components/          # React components
├── lib/                 # Shared utilities
└── types/               # TypeScript definitions

libs/
├── email-processing/    # Email processing library
├── domain-verification/ # Domain verification library
└── alias-management/    # Alias management library

tests/
├── contract/           # API contract tests
├── integration/        # Integration tests
├── e2e/               # End-to-end tests
└── unit/              # Unit tests
```

### Testing

The project uses multiple testing frameworks for comprehensive coverage:

```bash
# Run all tests (Jest + Vitest)
npm run test:all

# Unit tests with Jest
npm run test
npm run test:watch

# Contract tests with Vitest
npm run test:contract

# Integration tests with Vitest
npm run test:integration

# All Vitest tests
npm run test:vitest

# E2E tests with Playwright
npm run test:e2e

# Type checking
npm run type-check

# Build workspace libraries
npm run build:libs
```

#### Test Structure

- **Unit Tests** (`tests/unit/`): Component and utility testing with Jest
- **Contract Tests** (`tests/contract/`): API endpoint contract validation with Vitest
- **Integration Tests** (`tests/integration/`): End-to-end workflow testing with Vitest
- **E2E Tests** (`tests/e2e/`): Browser automation testing with Playwright

### Building

```bash
# Build workspace libraries first
npm run build:libs

# Build for production
npm run build

# Start production server
npm start
```

## Troubleshooting

### Common Issues

#### Build Errors
```bash
# If libraries fail to build
npm run build:libs

# If TypeScript errors persist
npm run type-check

# Clear Next.js cache
rm -rf .next
npm run build
```

#### Environment Issues
```bash
# Verify environment variables are loaded
npm run dev
# Check console for missing variables

# Test Supabase connection
# Visit /api/health (if implemented)

# Test Mailgun configuration
# Check Mailgun dashboard for webhook delivery
```

#### Database Issues
```bash
# Reset database (development only)
supabase db reset

# Check RLS policies
# Ensure user authentication is working
# Verify policies in Supabase dashboard
```

### Getting Help

1. Check the [Issues](https://github.com/your-repo/issues) page
2. Review the [API Documentation](./docs/api.md)
3. Verify your environment setup matches `.env.example`
4. Ensure all required services are configured correctly

## Contributing

1. Follow the Spec-Driven Development methodology
2. Write tests before implementation (TDD)
3. Ensure all tests pass before submitting
4. Follow the established code style

## License

MIT License - see LICENSE file for details
