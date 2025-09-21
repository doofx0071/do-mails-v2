# do-Mails v2

Privacy-focused email alias management system built with Next.js 14, TypeScript, Supabase, and Mailgun.

## Features

- **Unlimited Email Aliases**: Create unlimited aliases under your custom domains
- **Domain Management**: Add and verify custom domains with DNS validation
- **Unified Inbox**: Gmail-like interface for managing all your emails
- **Email Threading**: Automatic conversation grouping and threading
- **Privacy Protection**: Reply from alias addresses to protect your real email
- **Multi-User Support**: Complete data isolation with Row-Level Security

## Quick Start

1. **Clone the repository**
   ```bash
   git clone https://github.com/doofx0071/do-mails-v2.git
   cd do-mails-v2
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env.local
   # Edit .env.local with your configuration
   ```

4. **Run the development server**
   ```bash
   npm run dev
   ```

5. **Open your browser**
   Navigate to [http://localhost:3000](http://localhost:3000)

## Documentation

All documentation has been moved to the `md/` folder:

- [Setup Guide](md/SETUP.md) - Complete setup instructions
- [Environment Setup](md/ENVIRONMENT_SETUP.md) - Environment variables configuration
- [Email Setup Guide](md/EMAIL_SETUP_GUIDE.md) - Email configuration with Mailgun
- [Deployment Guide](md/DEPLOYMENT_GUIDE.md) - Production deployment instructions
- [Authentication Guide](md/AUTH_GUIDE.md) - Authentication setup with Supabase

## Tech Stack

- **Frontend**: Next.js 14, TypeScript, Tailwind CSS, shadcn/ui
- **Backend**: Supabase PostgreSQL with Row-Level Security
- **Email**: Mailgun API for sending/receiving emails
- **Authentication**: Supabase Auth
- **Deployment**: Vercel

## License

MIT License - see [LICENSE](LICENSE) for details.
