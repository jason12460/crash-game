<!--
  Sync Impact Report
  ==================
  Version: 0.0.0 → 1.0.0
  Change Type: MAJOR (Initial constitution ratification)
  Modified Principles: N/A (new constitution)
  Added Sections: All core principles and governance sections
  Removed Sections: None

  Template Sync Status:
  ✅ plan-template.md - Constitution Check section aligned
  ✅ spec-template.md - User story structure supports simple implementation
  ✅ tasks-template.md - Task organization supports incremental delivery

  Follow-up TODOs: None
-->

# Crash Game Constitution

## Core Principles

### I. Simplicity First

Every feature must start with the simplest possible implementation that works. Complex solutions require explicit justification showing why simpler alternatives were insufficient. Follow the YAGNI principle (You Aren't Gonna Need It) - implement only what is needed now, not what might be needed later.

**Rationale**: Simple code is easier to understand, test, maintain, and debug. Premature optimization and over-engineering create unnecessary complexity that slows development and increases bugs.

### II. Incremental Delivery

Features MUST be broken down into independently testable user stories, prioritized by value. Each user story should deliver working functionality that can be demonstrated and validated independently. The first user story (P1) defines the Minimum Viable Product (MVP).

**Rationale**: Incremental delivery enables early feedback, reduces risk, allows course correction, and ensures that the most valuable features are built first. Each increment should provide tangible user value.

### III. Clear Documentation

Every feature MUST have:
- A specification (spec.md) with clear user scenarios and acceptance criteria
- An implementation plan (plan.md) with technical context and structure decisions
- Executable tasks (tasks.md) organized by user story with explicit dependencies

Documentation must be written in plain language that non-technical stakeholders can understand.

**Rationale**: Clear documentation ensures shared understanding, enables effective collaboration, and provides a reference for future maintenance. It prevents miscommunication and scope creep.

### IV. Test When Valuable

Testing is OPTIONAL and should be included only when explicitly valuable for the feature. When tests are included, they must be written before implementation (TDD approach) and must fail initially to prove they test the right behavior.

Test types to consider when valuable:
- Contract tests for API boundaries
- Integration tests for critical user journeys
- Unit tests for complex business logic

**Rationale**: Not all code needs tests. Simple CRUD operations, UI layouts, and straightforward logic may not benefit from automated tests. Testing should add value, not ceremony. Focus testing efforts on high-risk, high-complexity, or frequently-changing code.

### V. Practical Technology Choices

Choose boring, well-established technology unless there is a compelling reason to do otherwise. Prefer solutions that:
- Have good documentation and community support
- Match the team's existing skills
- Solve the specific problem at hand
- Can be replaced or upgraded incrementally

**Rationale**: Proven technology reduces risk and learning curve. New/trendy technology should only be adopted when it provides clear, measurable benefits that outweigh the costs of learning and maintenance.

## Development Workflow

### Feature Development Process

1. **Specification** (/speckit.specify): Create spec.md with prioritized user stories
2. **Planning** (/speckit.plan): Research, design data models, define contracts
3. **Task Generation** (/speckit.tasks): Break down into dependency-ordered tasks
4. **Implementation** (/speckit.implement): Execute tasks incrementally by user story
5. **Validation**: Test each user story independently before moving to next priority

### Quality Standards

- Code MUST be readable and self-documenting with clear variable/function names
- Complex logic MUST have explanatory comments describing the "why" not the "what"
- Each user story MUST be independently testable and deliverable
- Breaking changes MUST be documented and migration paths provided
- Error messages MUST be helpful and actionable for users

### Parallel Work

Tasks marked [P] in tasks.md can be executed in parallel if they:
- Modify different files
- Have no data dependencies
- Belong to different user stories (after foundational phase)

## Technical Standards

### Project Organization

Use the single-project structure unless complexity clearly requires separation:

```
src/
├── models/      # Data structures and entities
├── services/    # Business logic
├── cli/         # Command-line interfaces
└── lib/         # Shared utilities

tests/
├── contract/    # API/boundary tests (if valuable)
├── integration/ # User journey tests (if valuable)
└── unit/        # Logic tests (if valuable)
```

### Complexity Justification

When violating simplicity principles (e.g., adding abstraction layers, introducing new dependencies, creating additional projects), document:
- What specific problem required the complexity
- What simpler alternatives were considered
- Why those alternatives were insufficient
- How the added complexity is contained and managed

## Governance

### Constitution Authority

This constitution defines the non-negotiable principles and standards for the Crash Game project. All features, code reviews, and architectural decisions MUST comply with these principles or provide explicit, documented justification for exceptions.

### Amendment Process

Constitution changes require:
1. Clear rationale for the change
2. Review of impact on existing features and templates
3. Update of all dependent templates (plan, spec, tasks)
4. Version bump following semantic versioning:
   - MAJOR: Removed or redefined core principles
   - MINOR: New principles or expanded guidance
   - PATCH: Clarifications or wording improvements

### Versioning Policy

- Constitution version follows MAJOR.MINOR.PATCH format
- All spec files reference the constitution version they comply with
- Breaking changes (MAJOR version bumps) require migration guidance

### Compliance Review

- All feature specifications (spec.md) MUST reference applicable principles
- All implementation plans (plan.md) MUST include Constitution Check section
- Code reviews MUST verify principle compliance
- Complexity violations MUST be tracked in plan.md Complexity Tracking table

**Version**: 1.0.0 | **Ratified**: 2025-10-23 | **Last Amended**: 2025-10-23
