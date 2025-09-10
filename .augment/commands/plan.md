---
description: Generate technical implementation plan from feature specification
argument-hint: Technology stack and architectural constraints
---

You are working in a Spec-Driven Development (SDD) repository. Your role is to create a comprehensive technical implementation plan based on an existing feature specification and user's technical requirements.

## Your Task

1. **Load the existing feature specification** from the current feature branch
2. **Setup the plan structure** using existing scripts
3. **Generate a complete implementation plan** following SDD methodology
4. **Ensure constitutional compliance** throughout the process

## Process

### Step 1: Setup Plan Structure
Run the plan setup script:
```bash
./scripts/setup-plan.sh
```

This will:
- Create the implementation plan template
- Set up the feature directory structure
- Prepare for plan generation

### Step 2: Load and Analyze Feature Specification

1. **Read the feature specification** from `specs/###-feature-name/spec.md`
2. **Extract key requirements** and user stories
3. **Identify any [NEEDS CLARIFICATION]** markers that must be resolved
4. **Map requirements to technical decisions**

### Step 3: Fill Out the Implementation Plan

Open `specs/###-feature-name/plan.md` and complete these sections:

#### Technical Context Section:
- **Language/Version**: e.g., Python 3.11, JavaScript ES2022
- **Primary Dependencies**: e.g., FastAPI, React, PostgreSQL
- **Storage**: Database or file system requirements
- **Testing**: Testing framework and strategy  
- **Target Platform**: Deployment target
- **Performance Goals**: Specific metrics
- **Scale/Scope**: Expected usage patterns

#### Constitution Check (CRITICAL):
Run through these gates before proceeding:

**Simplicity Gate**:
- [ ] Using ≤3 projects (max)
- [ ] Using framework directly (no wrapper classes)
- [ ] Single data model (no DTOs unless serialization differs)
- [ ] Avoiding unnecessary patterns

**Architecture Gate**:
- [ ] EVERY feature as library
- [ ] CLI per library with --help/--version/--format
- [ ] Library docs planned

**Testing Gate (NON-NEGOTIABLE)**:
- [ ] RED-GREEN-Refactor cycle enforced
- [ ] Tests MUST fail first before implementation
- [ ] Order: Contract→Integration→E2E→Unit
- [ ] Real dependencies used (actual DBs, not mocks)

### Step 4: Execute Phase 0 - Research

Create `specs/###-feature-name/research.md` with:
- Technology choices and rationale
- Alternatives considered  
- Best practices for chosen stack
- Integration patterns
- Performance considerations

### Step 5: Execute Phase 1 - Design & Contracts

Create these files:
- `specs/###-feature-name/data-model.md`: Entity definitions and relationships
- `specs/###-feature-name/quickstart.md`: Manual testing procedures
- `specs/###-feature-name/contracts/`: API specifications (OpenAPI, GraphQL schemas)

### Step 6: Update Agent Context

Run the agent context update script:
```bash
./scripts/update-agent-context.sh augment
```

If augment-specific context doesn't exist, update all available agent contexts:
```bash
./scripts/update-agent-context.sh
```

## Constitutional Enforcement

### Complexity Tracking
If you violate constitutional principles, document in the "Complexity Tracking" section:

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| [e.g., 4th project] | [current need] | [why 3 projects insufficient] |

### Phase Gates
- **Phase -1**: Constitutional compliance check
- **Phase 0**: Research completion
- **Phase 1**: Design and contracts
- **Phase 2**: (Handled by `/tasks` command)

## Technical Decision Framework

When making architectural choices:

1. **Start Simple**: Choose the most straightforward approach
2. **Library-First**: Every feature becomes a reusable library
3. **CLI-Accessible**: All functionality exposed via command line
4. **Test-Driven**: Design contracts and tests before implementation
5. **Constitutional**: All decisions must pass constitutional gates

## Example Technical Context

```markdown
**Language/Version**: Python 3.11
**Primary Dependencies**: FastAPI, SQLAlchemy, Pydantic
**Storage**: PostgreSQL with Alembic migrations
**Testing**: pytest with fixtures, real database
**Target Platform**: Linux containers
**Performance Goals**: <200ms API response time
**Scale/Scope**: 10k users, 100 requests/second
```

## Next Steps

After completing the implementation plan:
1. Verify all constitutional gates pass
2. Resolve any [NEEDS CLARIFICATION] markers
3. Use `/tasks` command to generate implementation tasks
4. Begin implementation following the generated plan

## Critical Reminders

- **NO IMPLEMENTATION CODE** in the plan - this is architecture only
- **TESTS FIRST** - plan the testing strategy before implementation
- **CONSTITUTIONAL COMPLIANCE** is non-negotiable
- **SIMPLICITY OVER CLEVERNESS** - choose boring solutions that work

Focus on creating a clear, implementable architecture that serves the business requirements while following SDD principles.
