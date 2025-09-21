# Spec Kit Development Guidelines

Auto-generated context for Auggie CLI. Last updated: 2025-01-10

## Project Overview

This is a **Spec-Driven Development (SDD)** repository using the Spec Kit framework. SDD inverts traditional development by making specifications executable - specs generate code, not the other way around.

## Active Technologies

- Python 3.11+ (CLI implementation)  
- Bash scripts (feature management utilities)
- Markdown templates (specification system)
- DocFX (documentation)
- Git (version control with feature branch workflow)

## Project Structure

```
├── src/specify_cli/           # Main CLI implementation
├── scripts/                   # Feature management utilities
├── templates/                 # SDD specification templates  
├── memory/                    # Constitutional framework
├── docs/                     # Documentation
├── .augment/commands/         # Auggie CLI custom commands
└── specs/                    # Generated feature specifications
    └── [###-feature-name]/   # Individual feature directories
```

## Auggie CLI Commands

The following custom commands are available for SDD workflow:

```bash
# Core SDD workflow commands
auggie specify "Build a user authentication system"     # Create feature specification
auggie plan "Use FastAPI with PostgreSQL"              # Generate implementation plan  
auggie tasks                                           # Break down into ordered tasks

# List available commands
auggie command list

# Get help for specific command
auggie command help specify
auggie command help plan  
auggie command help tasks
```

## Development Commands

```bash
# Initialize new SDD project
uvx --from git+https://github.com/github/spec-kit.git specify init my-project --ai claude

# Check system requirements  
uvx --from git+https://github.com/github/spec-kit.git specify check

# Feature management scripts
./scripts/create-new-feature.sh "feature description"
./scripts/setup-plan.sh
./scripts/update-agent-context.sh augment

# Development setup
pip install -e .
python -m pytest
ruff check src/

# Documentation
cd docs && docfx docfx.json --serve
```

## SDD Workflow

### The 5-Phase Process:
1. **Specification** (`auggie specify`): Business requirements, no tech details
2. **Planning** (`auggie plan`): Technical architecture with constitutional compliance  
3. **Task Generation** (`auggie tasks`): TDD-ordered implementation tasks
4. **Implementation**: Execute tasks following constitutional principles
5. **Validation**: Run tests and verify acceptance criteria

### Feature Branch Workflow:
- Branches follow `###-feature-name` format (e.g., `001-user-auth`)
- Each feature gets its own `specs/###-feature-name/` directory
- Standard artifacts: spec.md, plan.md, tasks.md, research.md, contracts/

## Constitutional Principles

### Core Articles (Non-Negotiable):
- **Library-First**: Every feature begins as standalone library
- **CLI Interface**: All libraries expose command-line functionality  
- **Test-First**: TDD mandatory - tests MUST fail before implementation
- **Integration Testing**: Real dependencies over mocks
- **Simplicity**: Maximum 3 projects, avoid over-engineering
- **Observability**: Structured logging, text-based I/O

### Constitutional Gates:
Implementation plans must pass these checkpoints:
- Simplicity Gate: ≤3 projects, direct framework usage
- Architecture Gate: Library-first, CLI interfaces
- Testing Gate: TDD cycle, contract→integration→E2E→unit order

## Code Style

### Python (src/specify_cli/):
- Follow PEP 8 conventions
- Use type hints with Python 3.11+ features
- Ruff for linting and formatting
- pytest for testing

### Bash Scripts (scripts/):
- Use `#!/usr/bin/env bash`
- Source `common.sh` for shared functions
- Support `--json` flags for programmatic output
- Include help with `--help` flag

### Markdown Templates (templates/):
- Use `[VARIABLE_NAME]` for placeholder substitution
- Include frontmatter with execution flows
- Mark ambiguities with `[NEEDS CLARIFICATION: question]`
- Enforce constitutional compliance through gates

## Recent Changes

- Added Auggie CLI integration with custom commands
- Created .augment/commands/ directory with SDD workflow
- Updated WARP.md with comprehensive development guidance

## Development Tips

### For Specifications:
- Focus on WHAT and WHY, avoid HOW
- Use `[NEEDS CLARIFICATION]` for assumptions
- Write for business stakeholders, not developers
- Make requirements testable and unambiguous

### For Implementation Plans:
- Pass all constitutional gates before proceeding
- Document complexity deviations with justification
- Generate research.md for technology decisions
- Create contracts/ directory with API specifications

### For Task Generation:
- Follow strict TDD: ALL tests before ANY implementation  
- Mark parallel tasks with [P] (different files, no dependencies)
- Use exact file paths in task descriptions
- Order: Setup → Tests → Models → Services → Integration → Polish

### Working with Auggie CLI:
- Use `--print` mode for automation and CI
- Combine `--continue` to resume and extend conversations
- Save context with `--workspace-root` for project awareness
- Use custom commands for consistent SDD workflow

## Integration Notes

Auggie CLI integrates seamlessly with the existing SDD toolchain:
- Custom commands in `.augment/commands/` follow SDD methodology
- Agent context updates via `./scripts/update-agent-context.sh augment`
- Follows same constitutional principles as other AI agents
- Supports the complete specification → planning → tasks → implementation flow

Keep agent context files under 150 lines for optimal token efficiency.
