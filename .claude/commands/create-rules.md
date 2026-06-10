---
description: Create global rules (CLAUDE.md + AGENTS.md + reference docs) from codebase analysis
---

# Create Global Rules

**Your role:** You are a project architect analyzing a codebase to establish conventions and rules.

Generate project rules by analyzing the codebase, confirming findings with the user, and producing three outputs:
1. `CLAUDE.md` — project essentials, auto-loaded every session
2. `.ai/AGENTS.md` — conventions, rules, testing strategy, on-demand references
3. `.ai/reference/*.md` — domain-specific reference docs (only project-relevant ones)

---

## Phase 1: AUTO-DETECT

Silently analyze the codebase. Do NOT ask questions yet — gather all findings first.

**Start by reading `PRD.md`** (if it exists) for context on architecture decisions, tech stack choices, and testing strategy. This informs detection and reduces redundant questions.

### Identify Project Type

| Type | Indicators |
|------|------------|
| Web App (Full-stack) | Separate client/server dirs, API routes |
| Web App (Frontend) | React/Vue/Svelte, no server code |
| API/Backend | Express/Fastify/etc, no frontend |
| Library/Package | `main`/`exports` in package.json, publishable |
| CLI Tool | `bin` in package.json, command-line interface |
| Monorepo | Multiple packages, workspaces config |
| Script/Automation | Standalone scripts, task-focused |

### Analyze Configuration

Look at root configuration files:

```
package.json       → dependencies, scripts, type
tsconfig.json      → TypeScript settings
pyproject.toml     → Python project config
go.mod             → Go modules
Cargo.toml         → Rust config
vite.config.*      → Build tool
*.config.js/ts     → Various tool configs
```

### Map Directory Structure

- Where does source code live?
- Where are tests?
- Any shared code?
- Configuration locations?

### Extract Tech Stack

From config files, identify:
- Runtime/Language and version
- Framework(s)
- Database (if any)
- Testing tools
- Build tools
- Existing linting/formatting setup

### Identify Patterns

Study existing code for:
- **Naming**: How are files, functions, classes named?
- **Structure**: How is code organized within files?
- **Errors**: How are errors created and handled?
- **Types**: How are types/interfaces defined?
- **Tests**: How are tests structured?

### Determine Reference Docs Needed

Based on detected project type, identify which reference docs would be useful:

| Project Aspect | Reference Doc |
|----------------|---------------|
| Frontend components | `.ai/reference/components.md` |
| API endpoints | `.ai/reference/api.md` |
| Database/models | `.ai/reference/database.md` |
| CLI commands/tools | `.ai/reference/tools.md` |
| Documentation standards | `.ai/reference/documentation.md` |
| Deployment/infra | `.ai/reference/deployment.md` |
| Other detected domains | `.ai/reference/<domain>.md` |

Only create docs relevant to the detected project type.

---

## Phase 2: GUIDED QUESTIONNAIRE

Present findings to the user and ask structured questions to confirm and fill gaps. Use multiple-choice questions when possible.

### Step 1: Confirm Detections

```
I analyzed the codebase and detected:

- **Project type:** [detected type]
- **Language/Runtime:** [detected]
- **Framework:** [detected]
- **Test framework:** [detected]
- **Build tool:** [detected]
- **Existing linting:** [detected or "none found"]

Is this correct? Anything to add or change?
```

### Step 2: Linting Rules

```
What linting setup do you want?

For [detected stack], common options are:
a) [Stack-specific option 1] — [brief description]
b) [Stack-specific option 2] — [brief description]
c) [Stack-specific option 3] — [brief description]
d) Custom — tell me what you want
e) Skip linting for now

[If existing linting detected]: I found [existing setup]. Keep it as-is, or adjust?
```

### Step 3: Testing Strategy

```
What testing strategy do you want?

I recommend [recommendation based on project type]:
a) Unit tests per function + devtests for features (recommended)
b) Integration tests only
c) E2E tests with browser automation
d) Combination — describe what you want

Test framework: [detected or ask which to use]
```

### Step 4: Custom Conventions

```
Any additional conventions or rules you want enforced?

Examples:
- Code comment style
- Git branch naming
- File size limits
- Import ordering
- Anything specific to your team or workflow
```

---

## Phase 3: GENERATE

### Create CLAUDE.md

Use the template at `.claude/CLAUDE-template.md` as a starting point. It already ships the static,
always-on directives — the `.ai/AGENTS.md` session-start pointer, **Working Style**, and
**Committing** — keep those as-is. Fill the project-specific sections below from Phase 1–2.

**Output path**: `CLAUDE.md` (project root)

**Fill these sections:**

1. **Project Overview** — What is this and what does it do?
2. **Tech Stack** — Technologies detected and confirmed
3. **Commands** — Dev, build, test, lint commands
4. **Project Structure** — Directory layout
5. **Architecture** — How the code is organized (if complex enough)
6. **Validation** — Commands to run before committing
7. **Key Files** — Important files to know about
8. **On-Demand Context** — Table of the reference docs that were actually created

**Do NOT add a Code Patterns or Testing section to CLAUDE.md** — coding conventions and testing
strategy live in `.ai/AGENTS.md` (single source of truth). The session-start pointer is already in
the template, so don't re-add it.

**Keep CLAUDE.md concise and scannable.** It's loaded every session — every token counts. Focus on what Claude can't figure out by reading the code.

### Create .ai/AGENTS.md

Use the template at `.claude/AGENTS-template.md` as a starting point.

**Output path**: `.ai/AGENTS.md`

Create the `.ai/` directory if it doesn't exist.

The template already ships the static content — keep it as-is, do NOT rewrite or duplicate it:

- **Engineering Principles** (4: no over-engineering, no workarounds, best practice, simplicity first)
- **Development Rules** (7: TDD, YAGNI, minimal-diff, comments-why, single-agent, test protection, only-what's-asked)

**Fill these sections from Phase 1–2:**

#### Conventions

[Conventions detected and confirmed in Phase 2: naming, imports, structure, error handling, types, etc.]

#### Testing Strategy

[Include testing strategy confirmed in Phase 2]

#### Linting Rules

[Include linting setup confirmed in Phase 2]

#### On-Demand References

When working on specific domains, read the relevant reference doc:

| Domain | Reference |
|--------|-----------|
| [detected domain] | `.ai/reference/[name].md` |

[Only include rows for reference docs that were actually created]

### Create .ai/reference/*.md

For each reference doc identified as relevant:

**Create focused, practical reference documents** containing:
- Patterns specific to that domain in THIS project
- Key files and their purposes
- Common operations and how to do them
- Things to watch out for

**Do NOT create generic reference docs.** Each doc should be specific to this project's patterns and conventions.

---

## Phase 4: OUTPUT

Present summary to the user:

```markdown
## Rules Created

### Files Generated

| File | Purpose |
|------|---------|
| `CLAUDE.md` | Project essentials (auto-loaded every session) |
| `.ai/AGENTS.md` | Conventions, rules, testing strategy |
| `.ai/reference/[name].md` | [purpose] |

### Project Type: [detected]

### Tech Stack: [summary]

### Linting: [chosen setup]

### Testing: [chosen strategy]

### Next Steps

1. Review the generated files
2. Adjust anything that doesn't look right
3. Approve the files so they can be committed to git
4. For each feature, start a new session and run `/prime` then `/plan-feature`
```

**After user approval:** Use `/commit` to commit all generated files.

---

## Tips

- Keep CLAUDE.md focused and scannable — it's loaded every session
- AGENTS.md can be more detailed — it's read once per session on demand
- Reference docs should be practical, not encyclopedic
- Don't duplicate information across files — reference instead
- Update these files as the project evolves
