---
description: Orient Claude to the base-proj-ai base template (layout, inventory, state). Refuses to run in derivative projects.
---

# Orient: Map the base-proj-ai Base Template

**Your role:** You are a template orienteer producing a concise layout + diagnostics report for sessions that are editing the base template itself — not building a product from it.

This command intentionally avoids embedded `!`bash`` blocks (Claude Code's slash-command static analyzer rejects complex shell). Instead you invoke a single helper script via the Bash tool — its allowlist entry is pre-granted in `.claude/settings.local.json`.

---

## Step 1: Gather state

Use the Bash tool to run exactly this command:

```
bash .claude/commands/orient/data.sh
```

The script anchors itself to the repo root, runs an entry-guard check, and emits all data in one shot. The first line of its output is either `MODE: TEMPLATE` or `MODE: DERIVATIVE`. After the mode line (in TEMPLATE mode) come seven labeled sections:

- `=== COMMANDS ===` — table rows (already formatted) for the Commands inventory
- `=== SKILLS_ENABLED ===` — table rows for enabled skills
- `=== SKILLS_PARKED ===` — table rows for parked skills
- `=== MCP_SERVERS ===` — table rows for MCP servers
- `=== FEATURES ===` — bullets for Dev Container Features installed
- `=== PLACEHOLDERS ===` — paths of intentional placeholder files
- `=== RECENT_COMMITS ===` — output of `git log --oneline -5`

---

## Step 2: Branch on mode

- **If `MODE: DERIVATIVE`:** Print exactly the following single line and stop. Do not produce any other output.

  > This is a derivative project — run /prime instead for project-level orientation.

- **If `MODE: TEMPLATE`:** Continue to Step 3.

---

## Step 3: Produce the Report

Compose one markdown report with the five sections below, in order. Keep it tight — the whole report should fit on roughly one screen. Quote the script output verbatim where the report calls for it; do not paraphrase descriptions.

### Section 1 — What this is

One sentence:

> `base-proj-ai` is the base/template repository copied wholesale to start every new project. This session is editing the template itself, not building a product.

### Section 2 — Layout map

Two parallel halves. Render each as a bullet list:

- **Devcontainer half (`.devcontainer/`)**
  - `Dockerfile` — Node 20 base with `claude-code`, OpenAI `codex` CLI + Codex plugin, Playwright/Chromium pre-installed.
  - `init-firewall.sh` — locks egress to GitHub, npm, Anthropic, OpenAI, VS Code marketplace.
  - `statusline.sh` — custom Claude Code status line (model, ctx, rate limits, branch).
  - `run-project-in-container-guide.md` — host-side guide for first-time container setup.
  - `features/` — pluggable Dev Container Features. Currently installed: (use the `=== FEATURES ===` section).
  - `devcontainer.json` — mounts the workspace + bash history + Claude config + Codex config + `~/.ssh`; seeds the status line and enables the Codex plugin via `postCreateCommand`; runs the firewall via `postStartCommand`.
- **AI layer**
  - `.claude/commands/` — slash commands (see Inventory below). Each command's aux files live under `.claude/commands/<name>/` (e.g. this command's data script is at `.claude/commands/orient/data.sh`).
  - `.claude/skills/` — enabled skills (see Inventory below).
  - `.claude/skills-disabled/` — parked skills (see Inventory below).
  - `.claude/hooks/session-start.sh` — injects `using-superpowers` into every session as additional context.
  - `.claude/CLAUDE-template.md` — template that `/create-rules` fills into the derivative's `CLAUDE.md`.
  - `.claude/PRD.md` — placeholder; `/create-prd` writes the real PRD to `PRD.md` at the repo root.
  - `.ai/AGENTS.md` — placeholder; `/create-rules` fills with 7 dev rules + conventions + on-demand reference index.
  - `.ai/reference/*.md` — placeholders; `/create-rules` fills only the domain docs relevant to the derivative.
  - `.mcp.json` — project-scoped MCP server config.
  - `CLAUDE.md` — minimal project rule: always commit via `/commit`.
  - `WORKFLOW.md` — the full multi-phase pipeline a derivative project follows.
  - `README.md` — human-facing one-liner + pointer to `/orient`.

### Section 3 — Inventory

Four small tables, populated from the script output.

**Commands** (rows from `=== COMMANDS ===`):

| Command | Purpose |
|---------|---------|
| (insert rows verbatim) |

**Skills enabled** (rows from `=== SKILLS_ENABLED ===`):

| Skill | Purpose |
|-------|---------|
| (insert rows verbatim) |

**Skills parked** (rows from `=== SKILLS_PARKED ===`):

| Skill | Purpose |
|-------|---------|
| (insert rows verbatim) |

**MCP servers** (rows from `=== MCP_SERVERS ===`):

| Server | Command |
|--------|---------|
| (insert rows verbatim) |

### Section 4 — Downstream workflow this template implements

When a derivative project uses this template, sessions follow this pipeline:

`brainstorming → /create-prd → /create-rules → /prime → /plan-feature → /execute → /commit`

See `WORKFLOW.md` for the full multi-phase narrative.

### Section 5 — State checks

- **Placeholders (intentional):** quote the `=== PLACEHOLDERS ===` paths. These stubs are filled in by `/create-prd` and `/create-rules` when the template is copied into a new project.
- **Last 5 commits:** quote the `=== RECENT_COMMITS ===` output so the session sees recent template-side activity.
- **Tools not yet migrated to Dev Container Features:** the Codex CLI/plugin and Playwright/Chromium are still baked into `.devcontainer/Dockerfile`. Cross-check the `=== FEATURES ===` list — currently only Serena is migrated. These are known migration candidates per the `devtool-integration-convention` auto-memory.
- **Two-PRD-locations note:** `.claude/PRD.md` is the in-template placeholder; `/create-prd` writes its output to `PRD.md` at the repo root. Keep both consistent if either is edited.

---

## Style

- Keep prose minimal. Prefer tables for the inventory.
- Quote the script output verbatim — do not paraphrase descriptions.
- Do not add a "What's next" or recommendations section.
