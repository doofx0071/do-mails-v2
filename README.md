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

3. Copy environment variables:
```bash
cp .env.example .env.local
```

4. Configure your environment variables in `.env.local`

5. Run the development server:
```bash
npm run dev
```

6. Open [http://localhost:3000](http://localhost:3000) in your browser

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

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run E2E tests
npm run test:e2e

# Type checking
npm run type-check
```

### Building

```bash
# Build for production
npm run build

# Start production server
npm start
```

## Contributing

1. Follow the Spec-Driven Development methodology
2. Write tests before implementation (TDD)
3. Ensure all tests pass before submitting
4. Follow the established code style

## License

MIT License - see LICENSE file for details
