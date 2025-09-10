---
description: Create a feature specification following Spec-Driven Development methodology
argument-hint: Feature description in natural language
---

You are working in a Spec-Driven Development (SDD) repository using the Spec Kit framework. Your role is to create a comprehensive feature specification from a user's natural language description.

## Your Task

1. **Parse the user's feature description** and extract key requirements
2. **Create a new feature branch and directory** using the existing scripts
3. **Generate a complete feature specification** using the spec template
4. **Fill out all required sections** with appropriate detail

## Process

### Step 1: Create Feature Branch and Directory
Run the feature creation script:
```bash
./scripts/create-new-feature.sh "[user's feature description]"
```

This will:
- Create a new branch named `###-feature-name`
- Create the specs directory structure
- Copy the spec template

### Step 2: Fill Out the Specification Template

Open the generated `specs/###-feature-name/spec.md` file and complete these sections:

#### Required Sections:
- **User Scenarios & Testing**: Write clear user stories and acceptance scenarios
- **Functional Requirements**: List specific, testable requirements (FR-001, FR-002, etc.)
- **Key Entities**: Define data entities if applicable

#### Important Guidelines:
- ✅ Focus on **WHAT** users need and **WHY**
- ❌ Avoid **HOW** to implement (no tech stack, APIs, code structure)  
- 👥 Write for business stakeholders, not developers
- 🔍 Use `[NEEDS CLARIFICATION: specific question]` for any ambiguities
- 📝 Make requirements testable and unambiguous

### Step 3: Review and Validate

Complete the "Review & Acceptance Checklist":
- [ ] No implementation details (languages, frameworks, APIs)
- [ ] Focused on user value and business needs  
- [ ] Written for non-technical stakeholders
- [ ] All mandatory sections completed
- [ ] No [NEEDS CLARIFICATION] markers remain
- [ ] Requirements are testable and unambiguous
- [ ] Success criteria are measurable

## Constitutional Principles

Remember these core SDD principles:
- **Library-First**: Every feature begins as a standalone library
- **Test-First**: TDD is mandatory - tests before implementation
- **Simplicity**: Start simple, avoid over-engineering
- **Business Focus**: Specifications serve business needs, not technical preferences

## Next Steps

After completing the specification:
1. Review with stakeholders if needed
2. Use `/plan` command to create implementation architecture
3. Use `/tasks` command to break down into development tasks

## Example Output Structure

Your specification should result in a clear, business-focused document like:

```markdown
# Feature Specification: User Profile Management

## User Scenarios & Testing
### Primary User Story
As a registered user, I want to view and update my profile information so that my account details stay current.

### Acceptance Scenarios
1. **Given** I am logged in, **When** I navigate to my profile, **Then** I see my current information
2. **Given** I update my email, **When** I save changes, **Then** I receive a verification email

## Requirements
### Functional Requirements  
- **FR-001**: System MUST allow users to view their profile information
- **FR-002**: System MUST allow users to update profile fields
- **FR-003**: System MUST validate email addresses before saving
```

Focus on clarity, completeness, and business value. The specification will drive all subsequent technical decisions.
