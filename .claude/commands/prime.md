---
description: Prime agent with codebase understanding, project history, and plan status
---

# Prime: Load Project Context

**Your role:** You are a codebase analyst building comprehensive project understanding for the session ahead.

## Objective

Build comprehensive understanding of the codebase, what has been done so far, and what's next. This command is designed to be run at the start of each new feature session.

## Process

### 1. Read Project Rules

- Read `CLAUDE.md` (project essentials)
- Read `.ai/AGENTS.md` (conventions, rules, testing strategy)
- Identify which `.ai/reference/*.md` docs exist (read them only if relevant to the upcoming work)

### 2. Analyze Project Structure

List all tracked files:
!`git ls-files`

Show directory structure:
On Linux, run: `tree -L 3 -I 'node_modules|__pycache__|.git|dist|build'`

### 3. Read Core Documentation

- Read the PRD.md or similar spec file
- Read README files at project root and major directories
- Read any architecture documentation
- Read database schema/config if applicable

### 4. Identify Key Files

Based on the structure, identify and read:
- Main entry points (main.py, index.ts, app.py, etc.)
- Core configuration files (pyproject.toml, package.json, tsconfig.json)
- Key model/schema definitions
- Important service or controller files

### 5. Understand Project History

Check full project trajectory (not just recent commits):
!`git log --oneline --all`

Check current branches and their status:
!`git branch -a`

Check current working state:
!`git status`

Understand the arc of development: what features were built, in what order, what the recent focus has been.

### 6. Scan Plan Status

Check for existing plans:
!`ls .ai/plans/*.md 2>/dev/null || echo "(no plans yet)"`

For each plan found, read the frontmatter to determine status:
- `status: planned` — not yet started
- `status: in-progress` — work underway
- `status: completed` — done
- `status: discarded` — work was abandoned

## Output Report

Provide a concise summary covering:

### Project Overview
- Purpose and type of application
- Primary technologies and frameworks
- Current version/state

### Architecture
- Overall structure and organization
- Key architectural patterns identified
- Important directories and their purposes

### Tech Stack
- Languages and versions
- Frameworks and major libraries
- Build tools and package managers
- Testing frameworks

### Project Rules (from AGENTS.md)
- Key conventions and rules in effect
- Testing strategy
- Linting setup

### Development History
- What features have been built (from git log)
- Active branches and their purpose
- Recent development focus

### Plan Status
| Plan | Status | Description |
|------|--------|-------------|
| [plan file] | [status] | [brief summary] |

### Feature Coverage
Cross-reference the PRD's feature list / implementation phases against existing plans:

| PRD Feature/Phase | Plan | Status |
|-------------------|------|--------|
| [feature from PRD] | [plan file if exists] | [planned/in-progress/completed/no plan yet] |

### What's Next
Based on feature coverage, open branches, and recent activity:
- Which PRD features have no plan yet?
- Any in-progress work that needs finishing?
- What is the recommended next feature to plan?
- Any blockers or concerns visible from the current state?

**Make this summary easy to scan — use bullet points and clear headers.**
