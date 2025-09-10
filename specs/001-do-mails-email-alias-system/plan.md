# Implementation Plan: do-Mails Email Alias and Inbox Management System

**Branch**: `001-do-mails-email-alias-system` | **Date**: 2025-09-10 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/001-do-mails-email-alias-system/spec.md`

## Execution Flow (/plan command scope)
```
1. Load feature spec from Input path
   → If not found: ERROR "No feature spec at {path}"
2. Fill Technical Context (scan for NEEDS CLARIFICATION)
   → Detect Project Type from context (web=frontend+backend, mobile=app+api)
   → Set Structure Decision based on project type
3. Evaluate Constitution Check section below
   → If violations exist: Document in Complexity Tracking
   → If no justification possible: ERROR "Simplify approach first"
   → Update Progress Tracking: Initial Constitution Check
4. Execute Phase 0 → research.md
   → If NEEDS CLARIFICATION remain: ERROR "Resolve unknowns"
5. Execute Phase 1 → contracts, data-model.md, quickstart.md, agent-specific template file (e.g., `CLAUDE.md` for Claude Code, `.github/copilot-instructions.md` for GitHub Copilot, or `GEMINI.md` for Gemini CLI).
6. Re-evaluate Constitution Check section
   → If new violations: Refactor design, return to Phase 1
   → Update Progress Tracking: Post-Design Constitution Check
7. Plan Phase 2 → Describe task generation approach (DO NOT create tasks.md)
8. STOP - Ready for /tasks command
```

**IMPORTANT**: The /plan command STOPS at step 7. Phases 2-4 are executed by other commands:
- Phase 2: /tasks command creates tasks.md
- Phase 3-4: Implementation execution (manual or via tools)

## Summary
Primary requirement: Build a privacy-focused email alias management system that allows users to create unlimited email aliases under their custom domains, manage emails in a unified Gmail-like inbox, and maintain privacy by sending replies from alias addresses rather than real email addresses.

Technical approach: Next.js 14 full-stack application with TypeScript, Supabase backend (PostgreSQL + Auth + Storage), Mailgun for email processing, TanStack Query for data fetching, and shadcn/ui for Gmail-style interface components.

## Technical Context
**Language/Version**: TypeScript 5.x with Next.js 14 (App Router)
**Primary Dependencies**: Next.js, Supabase (PostgreSQL + Auth + Storage), Mailgun API, TanStack Query, Zustand, Tailwind CSS, shadcn/ui
**Storage**: Supabase PostgreSQL with Row-Level Security (RLS), Supabase Storage for attachments
**Testing**: Jest + React Testing Library for frontend, Vitest for API routes, Playwright for E2E
**Target Platform**: Vercel deployment (Next.js + API routes), Supabase managed services
**Project Type**: web (frontend + backend via Next.js API routes)
**Performance Goals**: <200ms API response time, <2s page load time, real-time email updates
**Constraints**: Multi-tenant with strict data isolation via RLS, GDPR compliance for email data
**Scale/Scope**: 1000+ users, 10k+ emails per user, 100+ domains per user, 1000+ aliases per domain

## Constitution Check
*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

**Simplicity**:
- Projects: 3 (frontend+api via Next.js, email-processing library, domain-verification library)
- Using framework directly? Yes (Next.js App Router, Supabase client, Mailgun SDK)
- Single data model? Yes (TypeScript interfaces shared between frontend/backend)
- Avoiding patterns? Yes (no Repository/UoW, direct Supabase queries)

**Architecture**:
- EVERY feature as library? Yes
- Libraries listed: 
  - email-processing (Mailgun integration, email parsing, thread grouping)
  - domain-verification (DNS TXT record validation)
  - alias-management (alias creation, validation, status tracking)
- CLI per library: 
  - email-processing: --process-webhook, --send-email, --help, --version
  - domain-verification: --verify-domain, --check-dns, --help, --version
  - alias-management: --create-alias, --list-aliases, --help, --version
- Library docs: llms.txt format planned for each library

**Testing (NON-NEGOTIABLE)**:
- RED-GREEN-Refactor cycle enforced? Yes (tests written before implementation)
- Git commits show tests before implementation? Yes (commit strategy documented)
- Order: Contract→Integration→E2E→Unit strictly followed? Yes
- Real dependencies used? Yes (actual Supabase instance, real Mailgun sandbox)
- Integration tests for: All libraries, API contracts, database schemas
- FORBIDDEN: Implementation before test, skipping RED phase

**Observability**:
- Structured logging included? Yes (Next.js built-in + custom email processing logs)
- Frontend logs → backend? Yes (error reporting via API routes)
- Error context sufficient? Yes (user-friendly messages + detailed server logs)

**Versioning**:
- Version number assigned? 1.0.0 (MAJOR.MINOR.BUILD)
- BUILD increments on every change? Yes (automated via CI)
- Breaking changes handled? Yes (database migrations, API versioning)

## Project Structure

### Documentation (this feature)
```
specs/001-do-mails-email-alias-system/
├── plan.md              # This file (/plan command output)
├── research.md          # Phase 0 output (/plan command)
├── data-model.md        # Phase 1 output (/plan command)
├── quickstart.md        # Phase 1 output (/plan command)
├── contracts/           # Phase 1 output (/plan command)
└── tasks.md             # Phase 2 output (/tasks command - NOT created by /plan)
```

### Source Code (repository root)
```
# Option 2: Web application (frontend + backend via Next.js)
src/
├── app/                 # Next.js 14 App Router
│   ├── (auth)/         # Auth-protected routes
│   ├── api/            # API routes
│   ├── globals.css     # Tailwind CSS
│   └── layout.tsx      # Root layout
├── components/         # React components (shadcn/ui)
│   ├── ui/            # shadcn/ui components
│   ├── mail/          # Gmail-style mail components
│   └── forms/         # Form components
├── lib/               # Shared utilities
│   ├── supabase/      # Supabase client & types
│   ├── mailgun/       # Mailgun integration
│   └── utils/         # Helper functions
└── types/             # TypeScript type definitions

libs/
├── email-processing/   # Email processing library
├── domain-verification/ # Domain verification library
└── alias-management/   # Alias management library

tests/
├── contract/          # API contract tests
├── integration/       # Integration tests
├── e2e/              # Playwright E2E tests
└── unit/             # Unit tests
```

**Structure Decision**: Option 2 (Web application) - Next.js full-stack with separate libraries

## Phase 0: Outline & Research
1. **Extract unknowns from Technical Context** above:
   - Mailgun webhook configuration and domain routing setup
   - Supabase RLS policy patterns for multi-tenant email data
   - DNS TXT record verification implementation in Node.js
   - Email threading algorithm for conversation grouping
   - shadcn/ui mail components integration patterns

2. **Generate and dispatch research agents**:
   ```
   Task: "Research Mailgun webhook setup for custom domain email routing"
   Task: "Research Supabase RLS patterns for multi-tenant email applications"
   Task: "Research Node.js DNS resolution APIs for TXT record verification"
   Task: "Research email threading algorithms for conversation grouping"
   Task: "Research shadcn/ui mail component integration with TanStack Query"
   ```

3. **Consolidate findings** in `research.md` using format:
   - Decision: [what was chosen]
   - Rationale: [why chosen]
   - Alternatives considered: [what else evaluated]

**Output**: research.md with all technical unknowns resolved

## Phase 1: Design & Contracts
*Prerequisites: research.md complete*

1. **Extract entities from feature spec** → `data-model.md`:
   - User, Domain, EmailAlias, EmailMessage, EmailThread, EmailSignature, ForwardingRule, Label
   - Supabase table schemas with RLS policies
   - UUID primary keys and foreign key relationships

2. **Generate API contracts** from functional requirements:
   - REST API endpoints for domain management, alias creation, email operations
   - Mailgun webhook endpoints for inbound email processing
   - Output OpenAPI schema to `/contracts/api.yaml`

3. **Generate contract tests** from contracts:
   - API endpoint tests (must fail initially)
   - Webhook processing tests
   - Database schema validation tests

4. **Extract test scenarios** from user stories:
   - Domain verification flow integration tests
   - Email alias creation and management tests
   - Unified inbox and threading tests
   - Email composition and reply tests

5. **Update agent file incrementally**:
   - Run `/scripts/update-agent-context.sh claude` for Claude
   - Add Next.js 14, Supabase, Mailgun context
   - Preserve existing manual additions

**Output**: data-model.md, /contracts/*, failing tests, quickstart.md, CLAUDE.md

## Phase 2: Task Planning Approach
*This section describes what the /tasks command will do - DO NOT execute during /plan*

**Task Generation Strategy**:
- Load `/templates/tasks-template.md` as base
- Generate tasks from Phase 1 design docs
- Each API endpoint → contract test task [P]
- Each entity → Supabase table creation task [P]
- Each library → library setup and CLI task [P]
- Each user story → integration test task
- Implementation tasks to make tests pass

**Ordering Strategy**:
- TDD order: Tests before implementation
- Dependency order: Database schema → Libraries → API routes → Frontend components
- Mark [P] for parallel execution (independent files)

**Estimated Output**: 35-40 numbered, ordered tasks in tasks.md

**IMPORTANT**: This phase is executed by the /tasks command, NOT by /plan

## Phase 3+: Future Implementation
*These phases are beyond the scope of the /plan command*

**Phase 3**: Task execution (/tasks command creates tasks.md)
**Phase 4**: Implementation (execute tasks.md following constitutional principles)
**Phase 5**: Validation (run tests, execute quickstart.md, performance validation)

## Complexity Tracking
*No constitutional violations identified*

## Progress Tracking
*This checklist is updated during execution flow*

**Phase Status**:
- [x] Phase 0: Research complete (/plan command)
- [x] Phase 1: Design complete (/plan command)
- [x] Phase 2: Task planning complete (/plan command - describe approach only)
- [x] Phase 3: Tasks generated (/tasks command)
- [x] Phase 3.1: Setup complete (T001-T003)
- [x] Phase 3.2: Tests First (TDD) complete (T004-T026)
- [ ] Phase 3.3: Core Implementation (T027-T042)
- [ ] Phase 4: Implementation complete
- [ ] Phase 5: Validation passed

**Gate Status**:
- [x] Initial Constitution Check: PASS
- [x] Post-Design Constitution Check: PASS
- [x] All NEEDS CLARIFICATION resolved
- [x] Complexity deviations documented (none required)

---
*Based on Constitution v2.1.1 - See `/memory/constitution.md`*
