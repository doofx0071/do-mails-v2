# Environment Configuration Guide

This guide documents all required environment variables for the do-Mails v2 application.

## Required Environment Variables

### Core Application

```bash
# Next.js Application URL (required for webhooks)
NEXT_PUBLIC_APP_URL=https://your-domain.com
# OR for production deployments
APP_BASE_URL=https://your-domain.com

# Next.js Auth Configuration
NEXTAUTH_SECRET=your-nextauth-secret-key
NEXTAUTH_URL=https://your-domain.com
```

### Supabase Configuration

```bash
# Supabase Project Configuration (required)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# Supabase Service Role (server-side operations)
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### Mailgun Configuration

```bash
# Mailgun API Credentials (required)
MAILGUN_API_KEY=your-mailgun-api-key
MAILGUN_DOMAIN=your-verified-domain.com

# Mailgun Region Configuration
MAILGUN_REGION=US  # or EU
# OR set explicit base URL
MAILGUN_BASE_URL=https://api.mailgun.net  # US region
# MAILGUN_BASE_URL=https://api.eu.mailgun.net  # EU region

# Mailgun Webhook Security (recommended)
MAILGUN_WEBHOOK_SIGNING_KEY=your-webhook-signing-key
```

### Optional Service-to-Service Authentication

```bash
# Internal Service Key (for unauthenticated domain creation)
INTERNAL_SERVICE_KEY=your-internal-service-secret
```

## Environment Variable Details

### Mailgun Region Configuration

**US Region** (default):

- Base URL: `https://api.mailgun.net/v3`
- Use if your Mailgun account is in the US

**EU Region**:

- Base URL: `https://api.eu.mailgun.net/v3`
- Use if your Mailgun account is in the EU

### Authentication Flow

The application supports two authentication methods:

1. **User Authentication** (default):
   - Uses Supabase auth session
   - Domains are created with authenticated user's ID

2. **Service-to-Service** (fallback):
   - Requires `INTERNAL_SERVICE_KEY` environment variable
   - API calls must include headers:
     - `X-Service-Key: your-internal-service-secret`
     - `X-User-Id: valid-uuid-of-target-user`

## Database Setup

### Required Migration

Apply the latest migration to add Mailgun tracking columns:

```bash
# Using Supabase CLI
supabase db push

# Or manually apply migration 004_mailgun_ids_and_uuid_fix.sql
```

### Database Constraints

- All `domains.user_id` values must be non-null UUID references to `auth.users(id)`
- All primary keys are auto-generated UUIDs
- Domain verification tokens are automatically generated as 64-character hex strings

## Webhook Configuration

### Webhook URL Format

```
https://your-domain.com/api/webhooks/mailgun
```

### Supported Webhook Events

- `delivered` - Email successfully delivered
- `permanent_fail` - Permanent delivery failure
- `temporary_fail` - Temporary delivery failure (will retry)
- `complained` - Recipient marked as spam
- `unsubscribed` - Recipient unsubscribed
- `opened` - Email was opened
- `clicked` - Link in email was clicked

## Production Deployment Checklist

- [ ] All required environment variables are set
- [ ] MAILGUN_BASE_URL matches your Mailgun region
- [ ] NEXT_PUBLIC_APP_URL or APP_BASE_URL is set to your production domain
- [ ] Database migration 004 has been applied
- [ ] Mailgun domain is verified and active
- [ ] Webhook URL is accessible from Mailgun servers

## Common Issues

### Webhook 404 Errors

- Ensure `MAILGUN_BASE_URL` matches your account region
- Verify domain exists in Mailgun before webhook setup
- Check that API key has domain management permissions

### Database Constraint Violations

- Ensure user authentication is working
- Verify `user_id` is not null when creating domains
- Check that all ID references are valid UUIDs

### UUID Format Errors

- Never manually set `domains.id` in application code
- Always use database-generated UUIDs for primary keys
- Validate UUID format before using as foreign key references

## Development vs Production

### Development

```bash
NEXT_PUBLIC_APP_URL=http://localhost:3000
MAILGUN_REGION=US
# Use Mailgun test domain for development
```

### Production

```bash
NEXT_PUBLIC_APP_URL=https://your-production-domain.com
MAILGUN_BASE_URL=https://api.mailgun.net/v3  # Explicit region
# Use verified production domain
```
