# Tasks (Improvements & Hardening): do-Mails Email Alias and Inbox Management System

**Branch**: `001-do-mails-email-alias-system`  
**Date**: 2025-09-10  
**Total Tasks**: 34  
**Estimated Duration**: 1–2 weeks

## Phase 3.5: Security, Compliance, and Tooling Alignment

### Supabase RLS Enforcement (Critical)
- [x] **T043** Replace service role usage with user-scoped Supabase client in API routes (enforce RLS)
  Paths:
  - `src/app/api/domains/route.ts`
  - `src/app/api/aliases/route.ts`
  - `src/app/api/emails/threads/route.ts`
  - `src/app/api/emails/threads/[id]/route.ts`
  - `src/app/api/emails/messages/[id]/read/route.ts`
  - `src/app/api/emails/send/route.ts`
  - `src/app/api/webhooks/mailgun/route.ts`
- [x] **T044** Implement user JWT extraction and session on server requests (no service role for user data)
  Paths: `src/app/api/**/route.ts`; add helper in `src/lib/supabase/server.ts`
- [x] **T045** Verify RLS policies are triggered for all read/write paths (manual spot checks + small tests)

### Workspace & Libraries Resolution
- [x] **T046** Configure npm/yarn workspaces in root to include local libs
  Path: `package.json` ("workspaces": ["libs/*"])
- [x] **T047** Add root dependency references to local packages using workspace protocol
  Path: `package.json` (dependencies: `"@do-mails/domain-verification": "workspace:*"`, etc.)
- [x] **T048** Add root scripts to build all libs before Next.js dev/build
  Paths: `package.json` (scripts: `build:libs`, `dev` pre-script)
- [x] **T049** Ensure tsconfig path/alias resolution aligns with workspace builds
  Paths: `tsconfig.json`, libs `tsconfig.json`

### Test Runner Alignment
- [x] **T050** Add Vitest scripts to root
  Path: `package.json` (scripts: `test:contract`, `test:integration`, `test:vitest`, `test:all`)
- [x] **T051** Ensure CI (if present) runs both Jest and Vitest suites
  Path: `.github/workflows/*` or add new workflow

### Environment & Secrets
- [x] **T052** Create `.env.example` with all required variables and comments
  Path: `.env.example`
  Vars: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` (server-only), `MAILGUN_API_KEY`, `MAILGUN_DOMAIN`, `MAILGUN_WEBHOOK_SIGNING_KEY`, `APP_BASE_URL`
- [x] **T053** Update README with environment setup details and safety notes
  Path: `README.md`

## Phase 3.6: API Contract Compliance & Coverage

### Domains
- [x] **T054** Implement `POST /api/domains/[id]/verify` endpoint per OpenAPI
  Path: `src/app/api/domains/[id]/verify/route.ts`
- [x] **T055** Align `GET/POST /api/domains` responses with OpenAPI schemas (status codes, fields)
  Path: `src/app/api/domains/route.ts`

### Aliases
- [x] **T056** Implement/align `GET/POST /api/aliases` per OpenAPI (filters: domain_id, enabled)
  Path: `src/app/api/aliases/route.ts`
- [x] **T057** Implement/align `PATCH /api/aliases/[id]` for `is_enabled` updates
  Path: `src/app/api/aliases/[id]/route.ts`

### Emails
- [x] **T058** Implement/align `GET /api/emails/threads` with pagination and filters
  Path: `src/app/api/emails/threads/route.ts`
- [x] **T059** Implement/align `GET/PATCH /api/emails/threads/[id]` (archive, labels)
  Path: `src/app/api/emails/threads/[id]/route.ts`
- [x] **T060** Implement `POST /api/emails/messages/[id]/read`
  Path: `src/app/api/emails/messages/[id]/read/route.ts`
- [x] **T061** Implement `POST /api/emails/send` (Mailgun send, in-reply-to, attachments)
  Path: `src/app/api/emails/send/route.ts`

### Webhooks (Mailgun)
- [x] **T062** Add Mailgun webhook signature verification and robust parsing
  Path: `src/app/api/webhooks/mailgun/route.ts`
- [x] **T063** Persist inbound emails, create/update threads, and handle disabled aliases
  Path: `src/app/api/webhooks/mailgun/route.ts`
- [x] **T064** Store attachments in Supabase Storage and link to `email_attachments`
  Paths: `src/app/api/webhooks/mailgun/route.ts`, `src/lib/mail/attachments.ts`

## Phase 3.7: Data Model Feature Completion
- [x] **T065** Implement signatures endpoints (CRUD)
  Paths: `src/app/api/emails/signatures/route.ts`, `src/app/api/emails/signatures/[id]/route.ts`
- [x] **T066** Implement forwarding rules endpoints (CRUD)
  Paths: `src/app/api/emails/forwarding/route.ts`, `src/app/api/emails/forwarding/[id]/route.ts`
- [x] **T067** Implement attachment download endpoint with auth
  Path: `src/app/api/emails/attachments/[id]/route.ts`

## Phase 3.8: Frontend Integration & UX
- [x] **T068** Compose/Reply UI using alias selection; auto-choose alias on reply
  Paths: `src/components/emails/compose/*`, `src/app/dashboard/*`
- [x] **T069** Unified inbox with threading, archive, labels, read/unread
  Paths: `src/components/emails/threads/*`, `src/app/dashboard/*`
- [x] **T070** Search and filtering (by alias, sender, subject, date)
  Paths: `src/components/emails/search/*`, `src/app/dashboard/*`
- [x] **T071** Signatures management UI per alias
  Paths: `src/components/emails/signatures/*`, `src/app/dashboard/*`

## Phase 3.9: E2E Tests (Playwright)
- [x] **T072** E2E: Domain add + DNS verify happy path
  Path: `tests/e2e/domain-verification.spec.ts`
- [x] **T073** E2E: Alias create/toggle + receive + reply-from-alias
  Path: `tests/e2e/alias-inbox-reply.spec.ts`
- [x] **T074** E2E: Unified inbox search/filter/labels
  Path: `tests/e2e/inbox-filters.spec.ts`

## Phase 3.10: Observability & Performance
- [x] **T075** Add structured logging + request IDs across API routes
  Path: `src/lib/observability/logger.ts`, apply in `src/app/api/**/route.ts`
- [x] **T076** Add timing metrics and simple rate limiting on sensitive endpoints
  Path: `src/middleware.ts`, `src/lib/observability/metrics.ts`
- [x] **T077** Optimize hot queries (threads list, search) with indexes and pagination
  Paths: SQL review in `supabase/migrations/*.sql` and query code in `src/app/api/emails/*`
- [x] **T078** Cache domain verification checks (avoid repeated DNS)
  Path: `libs/domain-verification/src/verifier.ts`

## Dependencies

### Critical Path (Sequential)
1. RLS Enforcement (T043–T045) → API Contract Alignment (T054–T061) → Webhooks/Attachments (T062–T064)  
2. Workspace Setup (T046–T049) → Build/Run API with local libs  
3. Env Setup (T052–T053) → Reliable local runs/tests  
4. Frontend Integration (T068–T071) → E2E (T072–T074)

### Parallel Execution Groups
- [P] Workspace & Scripts: T046–T051  
- [P] Email feature endpoints: T058–T061  
- [P] Frontend UX tasks: T068–T071

## Task Validation Checklist
- [ ] Supabase RLS enforced for all user-scoped data paths (no service role in standard requests)  
- [ ] API endpoints conform to OpenAPI contracts (paths, payloads, status codes)  
- [ ] Local libs resolve via workspace and build consistently  
- [ ] Vitest and Jest both runnable via npm scripts and CI  
- [ ] Webhook signature and attachments handling are secure and tested  
- [ ] Frontend supports compose/reply-from-alias, threading, labels, search  
- [ ] E2E flows cover domain verify, alias/inbox/reply, and filters  
- [ ] Observability and basic performance targets in place
