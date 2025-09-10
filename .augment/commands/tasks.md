---
description: Generate ordered implementation tasks from feature plan
argument-hint: Optional task filtering or priority adjustments
---

You are working in a Spec-Driven Development (SDD) repository. Your role is to generate a comprehensive, ordered list of implementation tasks based on the completed feature specification and implementation plan.

## Your Task

1. **Load design documents** from the current feature branch
2. **Generate ordered tasks** following TDD and constitutional principles
3. **Mark parallel tasks** for efficient execution
4. **Create dependency graph** for clear task ordering

## Prerequisites

Before generating tasks, ensure these files exist:
- `specs/###-feature-name/spec.md` - Feature specification (required)
- `specs/###-feature-name/plan.md` - Implementation plan (required)
- `specs/###-feature-name/research.md` - Technology decisions
- `specs/###-feature-name/data-model.md` - Entity definitions
- `specs/###-feature-name/contracts/` - API specifications

## Process

### Step 1: Load and Analyze Design Documents

1. **Extract technical stack** from plan.md
2. **Extract entities** from data-model.md
3. **Extract contracts** from contracts/ directory
4. **Extract user stories** from spec.md

### Step 2: Generate Task Categories

Create tasks in these categories following constitutional order:

#### Phase 3.1: Setup
- Project structure creation
- Dependency installation  
- Linting and formatting tools configuration

#### Phase 3.2: Tests First (CRITICAL - MUST COMPLETE BEFORE 3.3)
- Contract tests for each API endpoint
- Integration tests for each user story
- All tests MUST be written and MUST FAIL before any implementation

#### Phase 3.3: Core Implementation (ONLY after tests are failing)
- Model creation for each entity
- Service layer for business logic
- CLI commands for each library
- API endpoints implementation
- Input validation and error handling

#### Phase 3.4: Integration
- Database connections
- Middleware and authentication
- Logging and monitoring
- Security headers and CORS

#### Phase 3.5: Polish
- Unit tests for edge cases
- Performance testing
- Documentation updates
- Code cleanup and optimization

### Step 3: Apply Task Rules

#### Parallel Execution Marking:
- Mark tasks with `[P]` if they:
  - Modify different files
  - Have no dependencies on each other
  - Can be executed simultaneously

#### Sequential Dependencies:
- Tests before implementation (TDD)
- Models before services
- Services before APIs
- Integration after core implementation

#### Task Numbering:
- Use format: T001, T002, T003, etc.
- Include exact file paths in descriptions

### Step 4: Create Task File

Open `specs/###-feature-name/tasks.md` and populate with structured tasks:

```markdown
# Tasks: [Feature Name]

## Phase 3.1: Setup
- [ ] T001 Create project structure per implementation plan
- [ ] T002 Initialize [language] project with [framework] dependencies
- [ ] T003 [P] Configure linting and formatting tools

## Phase 3.2: Tests First (TDD) ⚠️ MUST COMPLETE BEFORE 3.3
**CRITICAL: These tests MUST be written and MUST FAIL before ANY implementation**
- [ ] T004 [P] Contract test POST /api/users in tests/contract/test_users_post.py
- [ ] T005 [P] Contract test GET /api/users/{id} in tests/contract/test_users_get.py
- [ ] T006 [P] Integration test user registration in tests/integration/test_registration.py
...
```

## Task Generation Rules

### From Contracts:
- Each contract file → contract test task [P]
- Each endpoint → implementation task

### From Data Model:
- Each entity → model creation task [P]
- Relationships → service layer tasks

### From User Stories:
- Each story → integration test [P]
- Quickstart scenarios → validation tasks

### Ordering Priority:
1. Setup tasks
2. ALL tests (with [P] for parallel execution)
3. Models and core logic
4. API endpoints and integration
5. Polish and optimization

## Constitutional Compliance

### Test-First Mandate (NON-NEGOTIABLE):
- All tests MUST be written before implementation
- Tests MUST fail initially (Red phase)
- No implementation code before failing tests

### Simplicity Principle:
- Prefer direct framework usage
- Avoid unnecessary abstractions
- Maximum 3 projects

### Library-First Principle:
- Each feature as standalone library
- CLI interface for every library
- Clear separation of concerns

## Task Validation Checklist

Before finalizing tasks, verify:
- [ ] All contracts have corresponding tests
- [ ] All entities have model tasks
- [ ] All tests come before implementation
- [ ] Parallel tasks are truly independent
- [ ] Each task specifies exact file path
- [ ] No task modifies same file as another [P] task

## Example Task Structure

```markdown
## Phase 3.2: Tests First (TDD) ⚠️ MUST COMPLETE BEFORE 3.3
- [ ] T004 [P] Contract test POST /api/users in tests/contract/test_users_post.py
- [ ] T005 [P] Contract test GET /api/users/{id} in tests/contract/test_users_get.py
- [ ] T006 [P] Integration test user registration flow in tests/integration/test_registration.py

## Dependencies
- Tests (T004-T006) before implementation (T007-T012)
- T007 User model blocks T008 UserService
- All core implementation before polish tasks
```

## Parallel Execution Example

Tasks marked with `[P]` can be run simultaneously:
```bash
# Launch parallel contract tests:
Task T004: "Contract test POST /api/users in tests/contract/test_users_post.py"
Task T005: "Contract test GET /api/users/{id} in tests/contract/test_users_get.py"
Task T006: "Integration test registration in tests/integration/test_registration.py"
```

## Implementation Notes

- **Commit after each task** for clear progress tracking
- **Verify tests fail** before writing implementation
- **Follow TDD cycle**: Red → Green → Refactor
- **Use exact file paths** in task descriptions
- **Avoid vague tasks** like "implement user system"

## Next Steps

After generating tasks:
1. Review task order and dependencies
2. Begin with setup tasks (T001-T003)
3. Execute ALL test tasks before ANY implementation
4. Follow the generated order strictly
5. Mark tasks complete as you finish them

Focus on creating clear, actionable tasks that enforce constitutional principles and TDD methodology.
