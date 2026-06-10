---
description: Create conventional commits with verification for uncommitted changes
---

# Commit Changes

## Step 1: Understand What Changed

```bash
git status
git diff HEAD
git status --porcelain
```

Review the changes. Understand what was modified and why.

## Step 2: Verify Before Committing

Run the project's test suite to confirm nothing is broken:

```bash
# Use the test command from CLAUDE.md
```

**If tests fail:** Fix the issue first. Do NOT commit broken code.

**Report actual results:** "Tests: [N] passed, [N] failed" — not "should pass."

## Step 3: Detect Logical Changes

Analyze the diff. Are these changes one logical unit, or multiple?

**If multiple logical changes detected:**
Ask the user:
```
I see multiple logical changes in this diff:
1. [description of change 1]
2. [description of change 2]

Would you like to:
a) Split into separate commits (recommended)
b) Bundle into one commit
```

If splitting, stage and commit each change separately.

## Step 4: Stage and Commit

Stage specific files (not `git add -A`):
```bash
git add <specific files>
```

Use conventional commit format:
```
<type>(<scope>): <concise description (under 72 chars)>

What: <brief summary of the change>
Why: <motivation — what problem this solves or what feature this adds>
```

**Types:** `feat`, `fix`, `docs`, `refactor`, `test`, `chore`, `perf`, `style`, `build`, `ci`

**Scope:** The component or area affected (e.g., `auth`, `api`, `ui`, `db`)

## Step 5: Confirm

```bash
git log -1 --stat
```

Show the commit summary to the user.

## Examples

```
feat(auth): add JWT token validation for API endpoints

What: Added middleware to validate JWT tokens on protected routes
Why: Required for user authentication (plan: add-user-auth)
```

```
fix(api): handle empty email in registration endpoint

What: Added validation check for empty email before database insert
Why: Users could register with blank email, causing downstream errors
```

```
test(auth): add unit tests for token expiration handling

What: Added 5 tests covering token refresh, expiry, and invalid token cases
Why: Coverage gap identified during code review
```

## Rules

- **Atomic commits:** Each commit should be one logical change
- **Meaningful messages:** The git log serves as context for future sessions via `/prime`
- **No broken commits:** Tests must pass before committing
- **Specific staging:** Stage specific files, never `git add -A` (avoids committing secrets or generated files)
- **Subject line under 72 characters**
- **Body explains What and Why** — the diff shows the How
