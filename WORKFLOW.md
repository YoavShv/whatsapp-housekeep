# Development Workflow Guide

A step-by-step guide for developing a new project from scratch using the commands and skills in this repository.

> If you are editing this template itself rather than using it to build a product, run `/orient` first for a layout + diagnostics report of the base template.

---

## Phase A: Project Definition (one session)

### Step 1: Brainstorm the Idea

Start a conversation and describe your project idea in plain words. The `brainstorming` skill activates automatically. Claude will:

- Explore your project context (existing files, if any)
- Offer a visual companion if the topic involves UI/layouts
- Ask you clarifying questions **one at a time** (preferring multiple choice)
- If the project is too large, help you decompose it into sub-projects
- Propose 2-3 approaches with trade-offs and a recommendation
- Present the design section by section, asking for your approval on each

Once you approve, Claude tells you: **"Run `/create-prd` to formalize this into a PRD."**

### Step 2: `/create-prd`

Generates a comprehensive Product Requirements Document (`PRD.md`) from the conversation. Includes: executive summary, user stories, MVP scope, architecture, tech stack, implementation phases, success criteria, risks.

After generation, Claude asks you to review the PRD. Once you approve, it commits the file to git, then tells you: **"Run `/create-rules` to establish project conventions."**

### Step 3: `/create-rules`

This is a 3-phase process:

1. **Auto-detect** -- Claude reads `PRD.md` first for context, then silently analyzes the codebase: project type, language, framework, test setup, linting, directory structure, patterns.
2. **Guided questionnaire** -- Claude presents findings and asks you to confirm:
   - "I detected [X]. Correct?"
   - "What linting rules do you want?" (stack-specific options)
   - "What testing strategy?" (recommends unit tests per function + devtests)
   - "Any custom conventions?"
3. **Generate 3 file sets:**
   - `CLAUDE.md` -- project essentials, auto-loaded every session. Includes: "Read `.ai/AGENTS.md` at the start of every session."
   - `.ai/AGENTS.md` -- 4 engineering principles (no over-engineering, no workarounds, best practice, simplicity first) + your 7 development rules (TDD, YAGNI, minimal changes, code comments, single agent implementation, test protection, only code what's asked) + coding conventions + testing strategy + linting rules + on-demand reference table.
   - `.ai/reference/*.md` -- only the ones relevant to the project type (e.g., `components.md` for frontend, `api.md` for backend, `database.md` if using a DB).

After you review and approve the generated files, Claude commits them to git. Then: **"For each feature, start a new session and run `/prime` then `/plan-feature`."**

---

## Phase B: Per-Feature Development (new session for each feature)

### Step 4: `/prime`

Run this at the start of every feature session. It builds full context by:

1. Reading `CLAUDE.md` + `.ai/AGENTS.md` + relevant reference docs
2. Analyzing project structure (tracked files, directory tree)
3. Reading core documentation (PRD, README, architecture docs)
4. Identifying and reading key files (entry points, configs, models)
5. Reading **full** git history -- what features were built, in what order, recent focus
6. Scanning `.ai/plans/` -- reads frontmatter of each plan to show status (`planned` / `in-progress` / `completed` / `discarded`)
7. Building a **Feature Coverage table** -- cross-references PRD features/phases against existing plans to show what's been planned, what's in progress, and what has no plan yet

Outputs a scannable report with: project overview, architecture, tech stack, rules in effect, development history, plan status table, feature coverage table, and **"what's next"** recommendation.

### Step 5: `/plan-feature <feature-name>`

Up to 6 phases (Phase 1.5 activates only when the feature involves UI):

**Phase 1: Brainstorming** -- Claude asks clarifying questions one at a time, proposes 2-3 approaches, presents the design, waits for your approval. Does not proceed until you approve.

**Phase 1.5: UI Design** (only if feature involves UI) -- Claude detects UI involvement, confirms with you, and invokes the `ui-design` skill. The skill:

- On first use per session: checks available MCP servers for visual review. If no browser MCP is present, suggests 2-3 options (Playwright MCP, Glance MCP, Chrome DevTools MCP) with install steps for container vs non-container setups. Proceeds either way — review works in code-analysis mode without a browser MCP.
- Commits to a specific aesthetic direction (editorial, luxury, brutalist, playful, industrial, etc. — see `.claude/skills/ui-design/aesthetic-direction.md`) BEFORE writing HTML. This step prevents generic AI-generated output.
- Creates high-fidelity HTML mockup(s) in `designs/<feature-name>/` — self-contained files you can double-click to open in any browser. No build step.
- Dispatches a `ui-reviewer` subagent that checks layout, typography, color/contrast, motion, accessibility, and AI anti-patterns. Loops until approved (max 5 iterations).
- Presents the mockup(s) + design rationale summary (aesthetic direction + why it fits + key decisions) and asks you to approve. Does not proceed until both the subagent and you approve.

The approved mockup files are referenced in the plan document (Phase 4) and re-used by `/execute` Phase 3.5 for implementation review.

**Phase 2: Codebase intelligence** -- analyzes project structure, patterns, dependencies, testing patterns, integration points. Uses subagents for research when beneficial (but subagents never write code).

**Phase 3: External research** -- subagents research library docs, best practices, gotchas.

**Phase 4: Plan writing** -- produces a plan document at `.ai/plans/<feature-name>.md` with:

- Frontmatter: `status: planned`, feature name, date, branch name
- Feature description, user story, design summary
- Context references (specific files with line numbers)
- File structure table (all files to create/modify)
- Step-by-step TDD tasks (write failing test -> verify fail -> implement minimum code -> verify pass -> commit)
- Validation commands (linting, unit tests, integration tests, manual checks)
- Acceptance criteria
- Worktree reminder: "If planning multiple features simultaneously, consider git worktrees"

**Phase 5: Plan review** -- a subagent reviews the plan against the agreed design, AGENTS.md rules, and quality criteria. If Critical/Important issues found, Claude shows you the findings and asks: "Would you like to a) review each fix, or b) let me fix and re-review automatically?" Loops until clean (max 5 iterations).

After the plan passes review, Claude asks you to review it. Once you approve, it commits the plan file to git. Then: **"Plan committed. Run `/execute .ai/plans/<filename>.md` to start implementation."**

### Step 6: `/execute <path-to-plan>`

The most comprehensive command. Up to 6 phases (Phase 3.5 activates only if the plan has UI Design References):

**Phase 1: Setup**

- Reads the full plan and records the base branch SHA (for later code review)
- Updates plan status to `in-progress`
- Creates a feature branch (`feature/<name>` from plan frontmatter)
- Runs test suite to verify clean baseline. If tests fail, reports to user and stops.

**Phase 2: Implementation** (per task, in order)

- Follows TDD cycle strictly: write failing test -> verify it fails -> implement minimum code -> verify it passes -> refactor -> commit
- Enforces all 7 development rules (single agent, YAGNI, test protection, etc.)
- Adds code comments explaining WHY
- If a test fails unexpectedly: systematic debugging -- read error, reproduce, trace data flow, form hypothesis, test minimally
- If 3 fix attempts fail: STOPS and informs you -- "This may be architectural, not a simple bug"
- If an existing test needs changing: informs you and waits for approval
- Commits after each task with conventional format: `<type>(<scope>): <description>` with What/Why body
- Updates the plan file after each task: checks off completed steps (`- [ ]` to `- [x]`)

**Phase 3: Verification**

- Runs ALL validation commands from the plan (linting, unit tests, integration tests, manual checks)
- Reports actual output, not guesses. Forbidden: "should pass." Required: "Output shows: [actual output]"
- Fixes any failures using systematic debugging before proceeding
- If the plan's validation commands include e2e or browser-based testing, auto-invokes the `e2e-test` skill

**Phase 3.5: UI Implementation Review** (only if plan has UI Design References)

- Invokes the `ui-design` skill in implementation review mode
- If a browser MCP is available, renders the running implementation and captures screenshots for comparison
- Dispatches a `ui-reviewer` subagent with BOTH the approved mockup(s) AND the implementation — it checks that the final UI matches the approved design (layout, spacing, typography, colors, interactions, responsive behavior)
- Loops until the subagent approves (max 5 iterations)
- If UI fixes are made during this phase, re-runs the Phase 3 validation commands to catch any regressions
- Only requires subagent approval here — you already approved the design in `/plan-feature` Phase 1.5

**Phase 4: Code review**

- Dispatches a subagent reviewer with the full diff and the plan
- Handles feedback critically: verifies each suggestion, pushes back on YAGNI violations, fixes one item at a time
- Re-reviews until clean

**Phase 5: Finish branch**

- Final test verification
- Presents 4 options:
  1. Merge to base branch locally (plan status → `completed`)
  2. Push and create a Pull Request (plan status → `completed`)
  3. Keep the branch as-is (plan status stays `in-progress`)
  4. Discard (requires typed "discard" confirmation; plan status → `discarded`)
- Cleans up git worktree if one was used (except for option 3)

### Step 7: `/commit`

A standalone command for committing changes with conventional format. It:

1. Reviews what changed (`git status`, `git diff`)
2. Verifies tests pass -- reports actual results
3. Detects if there are multiple logical changes and asks: split or bundle?
4. Stages specific files (never `git add -A`)
5. Commits with conventional format including What/Why body
6. Shows the commit summary

The git log from these commits serves as context for `/prime` in future sessions.

---

## Then Repeat Phase B for Each Feature

Each new feature gets a new session: `/prime` -> `/plan-feature` -> `/execute`. The git history, plan statuses, and AGENTS.md rules carry forward as persistent context.

---

## Quick Reference

| Step | Command/Skill           | Input                          | Output                                                         |
| ---- | ----------------------- | ------------------------------ | -------------------------------------------------------------- |
| 1    | `brainstorming` (skill) | Your idea in plain words       | Approved design in conversation                                |
| 2    | `/create-prd`           | Conversation context           | `PRD.md`                                                       |
| 3    | `/create-rules`         | Codebase + your answers        | `CLAUDE.md` + `.ai/AGENTS.md` + `.ai/reference/*.md`   |
| 4    | `/prime`                | Codebase + git history + plans | Context summary report                                         |
| 5    | `/plan-feature`         | Feature name + conversation    | `.ai/plans/<name>.md` (+ `designs/<name>/*.html` if UI)    |
| 6    | `/execute`              | Path to plan file              | Implemented feature on branch (verified against mockups if UI) |
| 7    | `/commit`               | Uncommitted changes            | Conventional commit(s)                                         |

## Development Rules (enforced in `/execute`)

1. **Test-Driven Development** -- write failing tests first, then implement
2. **YAGNI** -- only code what is explicitly asked for
3. **Minimal code changes for bugs** -- smallest change that fixes the issue
4. **Code comments** -- explain WHY, not WHAT
5. **Single agent implementation** -- subagents for research/review only
6. **Test protection** -- never change existing tests without user approval
7. **Only code what's asked** -- no unasked improvements or future-proofing

---

## Optional: Codex Integration (devcontainer)

The devcontainer bakes in the OpenAI `codex` CLI + the `openai-codex` Claude Code plugin, exposing `/codex:review`, `/codex:rescue`, `/codex:setup`, `/codex:status`, `/codex:adversarial-review`, `/codex:result`, `/codex:cancel`, plus the `codex-rescue` agent inside Claude Code.

### First-time auth (required)

After the container starts, run **once** in the integrated terminal:

```bash
codex login --device-auth
```

This prints a URL and a one-time code. Open the URL in any browser (host or phone), enter the code, and sign in with your OpenAI / ChatGPT account. The token persists in the `codex-config-${devcontainerId}` named volume and survives container rebuilds -- you only re-login if that volume is removed.

Use `--device-auth` explicitly -- the default loopback OAuth flow tries to bind `localhost:1455` inside the container, which the host browser can't reach.

This is a test