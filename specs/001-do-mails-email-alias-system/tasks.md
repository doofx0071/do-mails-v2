# Tasks: do-Mails Email Alias and Inbox Management System

**Branch**: `001-do-mails-email-alias-system`  
**Date**: 2025-09-10  
**Total Tasks**: 42  
**Estimated Duration**: 3-4 weeks

## Phase 3.1: Setup (3 tasks)

- [x] **T001** Create Next.js 14 project structure with TypeScript and App Router in root directory
- [x] **T002** Install and configure dependencies: Supabase, Mailgun, TanStack Query, Zustand, Tailwind CSS, shadcn/ui
- [x] **T003** [P] Configure development tools: ESLint, Prettier, Jest, Playwright, and VS Code settings

## Phase 3.2: Tests First (TDD) ⚠️ MUST COMPLETE BEFORE 3.3

**CRITICAL: These tests MUST be written and MUST FAIL before ANY implementation**

### Contract Tests (API Endpoints)
- [x] **T004** [P] Contract test GET /api/domains in `tests/contract/domains-get.test.ts`
- [x] **T005** [P] Contract test POST /api/domains in `tests/contract/domains-post.test.ts`
- [x] **T006** [P] Contract test POST /api/domains/{id}/verify in `tests/contract/domains-verify.test.ts`
- [x] **T007** [P] Contract test GET /api/aliases in `tests/contract/aliases-get.test.ts`
- [x] **T008** [P] Contract test POST /api/aliases in `tests/contract/aliases-post.test.ts`
- [x] **T009** [P] Contract test PATCH /api/aliases/{id} in `tests/contract/aliases-patch.test.ts`
- [x] **T010** [P] Contract test GET /api/emails/threads in `tests/contract/emails-threads-get.test.ts`
- [x] **T011** [P] Contract test GET /api/emails/threads/{id} in `tests/contract/emails-thread-get.test.ts`
- [x] **T012** [P] Contract test PATCH /api/emails/threads/{id} in `tests/contract/emails-thread-patch.test.ts`
- [x] **T013** [P] Contract test POST /api/emails/send in `tests/contract/emails-send.test.ts`
- [x] **T014** [P] Contract test POST /api/emails/messages/{id}/read in `tests/contract/emails-read.test.ts`
- [x] **T015** [P] Contract test POST /api/webhooks/mailgun in `tests/contract/webhooks-mailgun.test.ts`

### Integration Tests (User Stories)
- [x] **T016** [P] Integration test domain addition and verification flow in `tests/integration/domain-verification.test.ts`
- [x] **T017** [P] Integration test email alias creation and management in `tests/integration/alias-management.test.ts`
- [x] **T018** [P] Integration test unified inbox experience in `tests/integration/inbox-experience.test.ts`
- [x] **T019** [P] Integration test email composition and privacy in `tests/integration/email-composition.test.ts`
- [x] **T020** [P] Integration test email threading and conversations in `tests/integration/email-threading.test.ts`
- [x] **T021** [P] Integration test email organization (labels, archive) in `tests/integration/email-organization.test.ts`
- [x] **T022** [P] Integration test search functionality in `tests/integration/email-search.test.ts`
- [x] **T023** [P] Integration test email signatures in `tests/integration/email-signatures.test.ts`

### Library Tests
- [x] **T024** [P] Library test email-processing CLI in `libs/email-processing/tests/cli.test.ts`
- [x] **T025** [P] Library test domain-verification CLI in `libs/domain-verification/tests/cli.test.ts`
- [x] **T026** [P] Library test alias-management CLI in `libs/alias-management/tests/cli.test.ts`

## Phase 3.3: Core Implementation (ONLY after tests are failing)

### Database Setup
- [ ] **T027** Create Supabase database schema with all tables in `supabase/migrations/001_initial_schema.sql`
- [ ] **T028** Create Row-Level Security (RLS) policies in `supabase/migrations/002_rls_policies.sql`
- [ ] **T029** Create database indexes for performance in `supabase/migrations/003_indexes.sql`

### Libraries Implementation
- [ ] **T030** [P] Implement email-processing library with Mailgun integration in `libs/email-processing/`
- [ ] **T031** [P] Implement domain-verification library with DNS checking in `libs/domain-verification/`
- [ ] **T032** [P] Implement alias-management library with validation in `libs/alias-management/`

### API Routes Implementation
- [ ] **T033** Implement domains API routes in `src/app/api/domains/route.ts` and `src/app/api/domains/[id]/verify/route.ts`
- [ ] **T034** Implement aliases API routes in `src/app/api/aliases/route.ts` and `src/app/api/aliases/[id]/route.ts`
- [ ] **T035** Implement emails API routes in `src/app/api/emails/` directory (threads, send, read endpoints)
- [ ] **T036** Implement Mailgun webhook handler in `src/app/api/webhooks/mailgun/route.ts`

### Frontend Components
- [ ] **T037** Implement authentication pages in `src/app/(auth)/` directory using Supabase Auth
- [ ] **T038** Implement domain management interface in `src/app/(dashboard)/domains/` directory
- [ ] **T039** Implement alias management interface in `src/app/(dashboard)/aliases/` directory
- [ ] **T040** Implement unified inbox interface using shadcn/ui mail components in `src/app/(dashboard)/inbox/`

## Phase 3.4: Integration

- [ ] **T041** Configure Supabase client and authentication middleware in `src/lib/supabase/`
- [ ] **T042** Set up TanStack Query providers and Zustand stores in `src/lib/stores/`

## Dependencies

### Critical Path (Sequential)
1. **Setup** (T001-T003) → **All Tests** (T004-T026) → **Implementation** (T027-T042)
2. **Database Schema** (T027-T029) → **API Routes** (T033-T036)
3. **Libraries** (T030-T032) → **API Routes** (T033-T036)
4. **API Routes** (T033-T036) → **Frontend Components** (T037-T040)
5. **Authentication** (T037) → **All Dashboard Components** (T038-T040)

### Parallel Execution Groups
- **Contract Tests**: T004-T015 can run simultaneously
- **Integration Tests**: T016-T023 can run simultaneously  
- **Library Tests**: T024-T026 can run simultaneously
- **Libraries**: T030-T032 can run simultaneously
- **Dashboard Components**: T038-T040 can run simultaneously (after T037)

## Task Validation Checklist

- [x] All API contracts have corresponding tests (T004-T015)
- [x] All user stories have integration tests (T016-T023)
- [x] All tests come before implementation (Phase 3.2 before 3.3)
- [x] Parallel tasks are truly independent (marked with [P])
- [x] Each task specifies exact file path
- [x] No task modifies same file as another [P] task
- [x] TDD cycle enforced (tests must fail before implementation)

## Implementation Notes

### TDD Enforcement
1. **Red Phase**: Write failing tests (T004-T026)
2. **Green Phase**: Implement minimal code to pass tests (T027-T042)
3. **Refactor Phase**: Clean up and optimize code

### Commit Strategy
- Commit after each task completion
- Use format: "T001: Create Next.js project structure"
- Ensure tests fail before implementation commits

### Testing Strategy
- **Contract Tests**: Validate API request/response schemas
- **Integration Tests**: Validate complete user workflows
- **E2E Tests**: Validate UI interactions (Playwright)
- **Unit Tests**: Validate individual functions and components

### Performance Targets
- API response time: <200ms
- Page load time: <2s
- Email processing: <30s from webhook to inbox
- Search results: <1s

### Security Requirements
- All database access through RLS policies
- Input validation on all API endpoints
- CSRF protection on state-changing operations
- Secure file upload handling for attachments

## Ready for Implementation

All tasks are ordered, dependencies mapped, and constitutional principles enforced. Begin with T001 and follow the sequence strictly, ensuring all tests fail before writing any implementation code.
