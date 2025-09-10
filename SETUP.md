# do-Mails Setup Guide

This guide will help you set up and test the do-Mails application.

## Prerequisites

- Node.js 18+ installed
- Supabase account and project
- Mailgun account (for email functionality)
- Git

## 1. Environment Setup

Create a `.env.local` file in the root directory:

```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Mailgun Configuration  
MAILGUN_API_KEY=your-mailgun-api-key
MAILGUN_DOMAIN=your-mailgun-domain
MAILGUN_BASE_URL=https://api.mailgun.net
MAILGUN_WEBHOOK_SIGNING_KEY=your-webhook-signing-key

# Application URLs
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-random-secret-key
```

### Getting Supabase Credentials

1. Go to [supabase.com](https://supabase.com) and create a project
2. Go to Settings → API
3. Copy the Project URL and anon public key
4. Copy the service_role secret key (keep this secure!)

### Getting Mailgun Credentials

1. Go to [mailgun.com](https://mailgun.com) and create an account
2. Add your domain in the Mailgun dashboard
3. Get your API key from Settings → API Keys
4. Get your webhook signing key from Settings → Webhooks

## 2. Install Dependencies

```bash
npm install
```

## 3. Database Migration

### Option A: Using Supabase Dashboard (Recommended)

1. Go to your Supabase project dashboard
2. Navigate to SQL Editor
3. Copy and paste the SQL from `scripts/migrate-database.md`
4. Run the migration

### Option B: Using Supabase CLI

```bash
# Install Supabase CLI
npm install -g supabase

# Link to your project
supabase link --project-ref YOUR_PROJECT_REF

# Run migrations
supabase db push
```

## 4. Verify Database Setup

Run this query in Supabase SQL Editor to verify tables were created:

```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('domains', 'email_aliases', 'email_threads', 'email_messages', 'email_attachments');
```

You should see all 5 tables listed.

## 5. Start the Development Server

```bash
npm run dev
```

The application will be available at `http://localhost:3000`

## 6. Create Your First User

1. Go to `http://localhost:3000/auth/signup`
2. Create an account with your email
3. Check your email for verification link
4. Click the verification link to activate your account

## 7. Test the Application

### Manual Testing

1. **Sign In**: Go to `/auth/signin` and log in
2. **Add Domain**: Go to `/dashboard/domains` and add a domain
3. **Verify Domain**: Follow the DNS instructions (optional for testing)
4. **Create Alias**: Go to `/dashboard/aliases` and create an email alias
5. **View Emails**: Go to `/dashboard` to see the email interface

### Automated API Testing

```bash
# First, get your auth token by signing in and checking localStorage
# Then set it as an environment variable
export TEST_AUTH_TOKEN="your-jwt-token-here"

# Run the API tests
node scripts/test-api-endpoints.js
```

## 8. Troubleshooting

### Common Issues

#### "No auth token" error
- Make sure you've signed in through the UI first
- Check that your Supabase credentials are correct
- Verify the user was created in Supabase Auth

#### Database connection errors
- Verify your Supabase URL and keys are correct
- Check that the database migration completed successfully
- Ensure RLS policies are enabled

#### Email functionality not working
- Domain verification is required for sending emails
- Set up DNS records as shown in the domain verification dialog
- Check Mailgun dashboard for delivery logs

#### UI components not rendering
- Make sure all dependencies are installed: `npm install`
- Check for any missing UI components in the console
- Verify Tailwind CSS is working

### Debug Steps

1. **Check Server Logs**: Look at the terminal running `npm run dev`
2. **Check Browser Console**: Look for JavaScript errors
3. **Check Network Tab**: Look for failed API requests
4. **Check Supabase Logs**: Go to Supabase dashboard → Logs

## 9. Production Deployment

### Environment Variables for Production

Make sure to set all environment variables in your production environment:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `MAILGUN_API_KEY`
- `MAILGUN_DOMAIN`
- `MAILGUN_WEBHOOK_SIGNING_KEY`
- `NEXTAUTH_SECRET`

### Deployment Platforms

The app can be deployed to:
- **Vercel** (recommended for Next.js)
- **Netlify**
- **Railway**
- **Heroku**
- **DigitalOcean App Platform**

### Domain Setup for Production

1. Add your production domain to Mailgun
2. Set up DNS records for email delivery
3. Configure webhook URLs in Mailgun dashboard
4. Update CORS settings if needed

## 10. Next Steps

After successful setup:

1. **Configure Email Routing**: Set up your domains and aliases
2. **Set up Webhooks**: Configure Mailgun webhooks for inbound email
3. **Customize UI**: Modify components to match your branding
4. **Add Features**: Extend functionality as needed
5. **Monitor**: Set up logging and monitoring for production

## Support

If you encounter issues:

1. Check this setup guide first
2. Look at the troubleshooting section
3. Check the project's GitHub issues
4. Review Supabase and Mailgun documentation

## File Structure

```
do-mails-v2/
├── src/
│   ├── app/                 # Next.js app router
│   ├── components/          # React components
│   ├── lib/                 # Utilities and configurations
│   └── middleware.ts        # Route protection
├── supabase/
│   └── migrations/          # Database migrations
├── scripts/                 # Setup and testing scripts
└── SETUP.md                # This file
```
