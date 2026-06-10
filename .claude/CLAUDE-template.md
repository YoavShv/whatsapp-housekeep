# CLAUDE.md

This file provides guidance to Claude Code when working with code in this repository.

> **At the start of every session, read `.ai/AGENTS.md`** for engineering principles, development rules, and conventions.

## Working Style

- Calibrate for an experienced developer: no hand-holding, no textbook fluff, pragmatic over comprehensive.

## Committing

**Always use `/commit` for ALL commits.** No direct `git commit` commands. This applies to you, subagents, skills, commands, and any other automated flow. `/commit` is the single source of truth for commit format and process.

---

## Project Overview
<!-- What is this project? One paragraph description -->
{Project description and purpose}

---

## Tech Stack

<!-- List technologies used. Add/remove rows as needed -->

| Technology | Purpose |
|------------|---------|
| {tech} | {why it's used} |

---

## Commands

<!-- Common commands for this project. Adjust based on your package manager and setup -->

```bash
# Development
{dev-command}
# Build
{build-command}
# Test
{test-command}
# Lint
{lint-command}
```

---

## Project Structure

<!-- Describe your folder organization. This varies greatly by project type -->

```
{root}/
├── {dir}/     # {description}
└── {dir}/     # {description}
```

---

## Architecture

<!-- Describe how the code is organized. Examples:
- Layered (routes → services → data)
- Component-based (features as self-contained modules)
- MVC pattern
- Event-driven
- etc.
-->

{Describe the architectural approach and data flow}

---

## Code Patterns

<!-- Key patterns and conventions used in this codebase -->

### Naming Conventions
- {convention}

### File Organization
- {pattern}

### Error Handling
- {approach}

---

## Testing

<!-- How to test and what patterns to follow -->

- **Run tests**: `{test-command}`
- **Test location**: `{test-directory}`
- **Pattern**: {describe test approach}

---

## Validation

<!-- Commands to run before committing -->

```bash
{commands to run before committing}
```

---

## Key Files

<!-- Important files to know about -->

| File | Purpose |
|------|---------|
| `{path}` | {description} |

---

## On-Demand Context

<!-- Optional: Reference docs for deeper context -->

| Topic | File |
|-------|------|
| {topic} | `.ai/reference/{name}.md` |

---

## Notes
<!-- Any special instructions, constraints, or gotchas -->
- {project-specific gotchas, constraints}
