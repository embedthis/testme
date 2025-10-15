# TestMe Agent Documentation

This directory contains structured documentation to assist AI agents (like Claude Code) in understanding and working with the TestMe project.

## Directory Structure

```
.agent/
├── README.md           # This file
├── context/            # Saved context for in-progress tasks
├── designs/            # Design documents
│   └── DESIGN.md       # Main architectural design
├── plans/              # Project plans
│   └── PLAN.md         # Development roadmap and status
├── procedures/         # Standard procedures
│   └── PROCEDURE.md    # Development workflows
├── logs/               # Change logs
│   └── CHANGELOG.md    # Detailed change history
├── references/         # External references
│   └── REFERENCES.md   # Links and resources
└── archive/            # Historical documentation
    ├── designs/
    ├── plans/
    ├── procedures/
    ├── logs/
    └── references/
```

## Document Index

### Core Documentation

- **[DESIGN.md](designs/DESIGN.md)** - Complete architectural design and implementation details
    - Architecture overview and data flow
    - Design patterns (Strategy, Template Method, Factory, Observer)
    - Key architectural decisions
    - Module responsibilities
    - Platform abstraction layer
    - Configuration system
    - Error handling strategy

- **[PLAN.md](plans/PLAN.md)** - Development roadmap and project status
    - Current status and version
    - Recently completed features
    - Current focus areas
    - Short-term and medium-term goals
    - Long-term vision
    - Technical debt tracking

- **[PROCEDURE.md](procedures/PROCEDURE.md)** - Standard development procedures
    - Development workflow
    - Testing procedures
    - Building and distribution
    - Adding new features
    - Code quality guidelines
    - Release procedures
    - Debugging procedures

- **[CHANGELOG.md](logs/CHANGELOG.md)** - Detailed change history
    - Chronological record of all changes
    - Feature additions
    - Bug fixes
    - Documentation updates
    - Breaking changes

- **[REFERENCES.md](references/REFERENCES.md)** - External links and resources
    - Bun runtime documentation
    - Compiler and toolchain references
    - Debugger documentation
    - Related projects
    - Technical standards

## Using This Documentation

### For AI Agents

When working on TestMe:

1. **Start with DESIGN.md** to understand the architecture
2. **Check PLAN.md** for current priorities and status
3. **Follow PROCEDURE.md** for standard workflows
4. **Review CHANGELOG.md** for recent changes
5. **Consult REFERENCES.md** for external documentation

### For Developers

This documentation provides:

- Architectural context for understanding the codebase
- Guidelines for adding new features
- Procedures for testing and releasing
- Historical context for design decisions

### Updating Documentation

Documentation should be updated when:

- **DESIGN.md**: Architecture or design patterns change
- **PLAN.md**: Development priorities shift or milestones are reached
- **PROCEDURE.md**: Workflows or processes change
- **CHANGELOG.md**: Any significant change is made
- **REFERENCES.md**: New external resources are discovered

## Documentation Principles

1. **Accuracy**: Documentation should reflect the current state of the project
2. **Completeness**: Include enough detail for understanding without being verbose
3. **Maintenance**: Keep documentation up-to-date with code changes
4. **Accessibility**: Write for both humans and AI agents
5. **Structure**: Use consistent formatting and organization

## Archive

The `archive/` directory contains historical versions of documentation. When making major changes to design or plans, move the old version to the archive with a dated filename.

---

**Last Updated**: 2025-10-16
**Project**: TestMe - Multi-language Test Runner
**Version**: 0.8.19
