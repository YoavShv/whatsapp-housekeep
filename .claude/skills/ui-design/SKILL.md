---
name: ui-design
description: "Use when a feature involves UI components (pages, layouts, forms, dashboards, visualizations). Creates high-fidelity HTML mockups, runs subagent review loops, and gets user approval before implementation. Also reviews implemented UI against approved mockups."
---

# UI Design Workflow

**Your role:** You are a UI design partner who produces high-fidelity HTML mockups, runs them through rigorous subagent review, and ensures implementation matches approved designs.

This skill is invoked by existing commands — not directly by the user — when a feature involves UI work:

- **From `/plan-feature` (Phase 1.5):** Design mode — create and approve mockups before the plan is written
- **From `/execute` (Phase 3.5):** Implementation review mode — verify implemented UI matches approved mockups

<HARD-GATE>
Do NOT proceed to plan writing or code review until the corresponding UI approval step has been completed. Design mode requires both subagent approval AND user approval. Implementation review mode requires subagent approval.
</HARD-GATE>

## When to Use

**Design mode** — invoked by `/plan-feature` when:
- Feature description includes UI elements (pages, layouts, forms, dashboards, navigation, visualizations)
- Brainstorming phase has produced a conceptually approved design
- Ready to translate conceptual design into a concrete visual specification

**Implementation review mode** — invoked by `/execute` when:
- The plan references mockup files in `designs/`
- Implementation (Phase 2) and verification (Phase 3) have completed
- Ready to check that implemented UI matches approved mockups

## MCP Discovery (first time only per session)

Before the first review loop, check what visual review tools are available:

1. **Check available MCP servers** — list MCP tools currently accessible. Look for browser-capable tools (Playwright, Glance, Chrome DevTools MCP).
2. **If a browser MCP is already available:** record this for the session. The reviewer subagent will receive screenshots.
3. **If no browser MCP is available:** inform the user and suggest 2-3 options:

   ```
   I can review the UI through code analysis, but adding a browser MCP would let me also
   render pages and analyze screenshots. I recommend one of these:

   1. Playwright MCP (Microsoft) — most popular, npm-based. Install:
      - Add to .mcp.json: { "playwright": { "command": "npx", "args": ["@playwright/mcp@latest"] } }
      - Plus one-time Chromium install: `npx playwright install --with-deps chromium`

   2. Glance MCP (DebugBase) — 30 tools, Chromium-based, returns screenshots inline. Install:
      - Add to .mcp.json: { "glance": { "command": "npx", "args": ["glance-mcp"] } }
      - Same Chromium requirement

   3. Chrome DevTools MCP (Google) — deep CSS/DOM inspection + screenshots. Install:
      - Add to .mcp.json: { "chrome-devtools": { "command": "npx", "args": ["chrome-devtools-mcp"] } }

   Container users: the Chromium install command also needs to run inside the container.
   For persistence across rebuilds, also add `RUN npx playwright install --with-deps chromium`
   to .devcontainer/Dockerfile. You may also need to whitelist the install domains in
   .devcontainer/init-firewall.sh.

   Want me to install one, or proceed with code-analysis-only review?
   ```

4. **Act on user response:**
   - If they choose an MCP: write the `.mcp.json` entry, then instruct them on the Chromium install step. Remind them to restart Claude Code to pick up the new MCP server.
   - If they decline or already have one: proceed.
5. **Record the outcome** — the subagent prompt will include `SCREENSHOT_AVAILABLE: true|false` based on what's actually usable right now.

Skip this discovery if you've already done it in the current session.

---

## Design Mode

Called from `/plan-feature` Phase 1.5 after brainstorming produces a conceptually approved design.

### 1. Set Up

- Create `designs/<feature-name>/` at the project root (kebab-case feature name)
- Identify the distinct UI pages/views/components to mock up. A feature may have one mockup (a single page) or several (e.g., login + dashboard + settings).

### 2. Commit to an Aesthetic Direction (BEFORE writing any HTML)

**This is the single most important step.** Without it, mockups default to generic AI-generated aesthetics (Inter on white with a purple gradient).

Read the aesthetic direction guide at `.claude/skills/ui-design/aesthetic-direction.md`. Use its Design Thinking framework (Purpose / Tone / Constraints / Differentiation) and aesthetic direction options (brutally minimal, editorial, luxury, playful, brutalist, etc.) to commit to one direction.

**Announce the direction** before coding — in a single sentence, to the user:

> "Going with **editorial/magazine** for this mockup — serif display, single-column reading flow, generous left margin, considered restraint."

**Apply the variation principle**: do not default to the same aesthetic as a previous mockup in this project. Each feature deserves an intentional direction choice that fits its context.

### 3. Create Each Mockup

For each UI surface:

- Filename: `designs/<feature-name>/<page-name>.html` (kebab-case, semantic — e.g., `user-dashboard.html`, `login-page.html`)
- **Self-contained**: everything inline or from CDN. No build step, no local dependencies. The user double-clicks the file and it opens in any browser.
- **High fidelity with intent**: use whatever stack serves the chosen aesthetic direction. Tailwind via CDN is fine as *infrastructure*, but override its defaults — Inter, gray-scale palette, stock spacing are the baseline AI look. Pull distinctive fonts from Google Fonts (see aesthetic-direction.md for direction-appropriate choices), commit to an intentional palette via CSS variables, add atmospheric backgrounds (noise, gradient mesh, pattern, intentional flat) that match the direction.
- **Realistic content**: no Lorem Ipsum for user-facing text. Use plausible, real-sounding copy. Lorem Ipsum hides content fit issues.
- **Header comment** at the top of each file:

  ```html
  <!--
    Feature: <feature-name>
    Page: <page-name>
    Purpose: <one sentence — what this page does>
    Aesthetic direction: <e.g., "editorial/magazine — serif display, single-column reading flow, generous margins">
    Design rationale:
      - <key decision 1 and why>
      - <key decision 2 and why>
      - <key decision 3 and why>
    Linked brainstorming decisions: <what from the conceptual design drove this>
  -->
  ```

- **Include interactive states** where they clarify the design: hover states, focus states, disabled states, empty states, loading states. Use CSS + minimal JS to demonstrate them.
- **Indicate responsiveness**: if the design should adapt at different widths, the mockup should work at mobile, tablet, and desktop widths. If it's desktop-only, state that in the header comment.

### 4. Subagent Review Loop

Dispatch a `ui-reviewer` subagent using the template at `.claude/skills/ui-design/ui-reviewer.md`.

Fill placeholders:
- `{REVIEW_MODE}` → `design`
- `{FEATURE_NAME}` → the feature name
- `{MOCKUP_FILES}` → comma-separated list of paths to the mockup files
- `{DESIGN_CONTEXT}` → 2-3 sentence summary of what the UI should accomplish (from brainstorming)
- `{SCREENSHOT_AVAILABLE}` → `true` or `false` based on MCP discovery
- `{IMPLEMENTATION_FILES}` → leave blank (not applicable in design mode)
- `{APPROVED_DESIGN_FILES}` → leave blank (not applicable in design mode)

If `SCREENSHOT_AVAILABLE` is true, the subagent should also render and screenshot each mockup via the available browser MCP.

**Loop logic:**
- Subagent returns Critical / Important / Minor findings + Approved / With fixes / Not approved verdict
- If Critical or Important issues exist: fix the mockup file(s), then re-dispatch the subagent
- Loop until the subagent returns Approved (no Critical/Important issues)
- Max 5 iterations. If still not approved after 5: stop, summarize the remaining issues for the user, and ask for guidance.

Minor issues: apply silently without re-review.

### 5. User Approval

Once the subagent approves:

1. Tell the user:
   ```
   UI review complete — subagent approved the design.

   Mockup file(s):
   - designs/<feature-name>/<page-1>.html
   - designs/<feature-name>/<page-2>.html

   Open each in a browser (double-click the file) to review.
   ```

2. Present a **design rationale summary**:
   ```
   Design rationale summary:

   Aesthetic direction: <e.g., "editorial/magazine">
   - Why this direction fits: <reason — ties to feature purpose or audience>

   Key design decisions:
   - <key decision 1>: <why> (e.g., "single-column layout: you said mobile-first is a priority")
   - <key decision 2>: <why>
   - <key decision 3>: <why>

   Brainstorming decisions reflected:
   - <conceptual decision from brainstorming>: <how it manifested in the mockup>
   - <conceptual decision>: <how it manifested>

   Open questions / trade-offs:
   - <anything worth explicitly flagging for user attention>
   ```

3. Ask: **"Does this design look right? Approve to proceed with planning, or tell me what to change."**

4. **On change request:** update the mockup(s), re-run the subagent review loop from step 3, then re-present to the user.

5. **On approval:** return control to `/plan-feature` Phase 2. The plan (written in Phase 4) will reference these mockup files.

---

## Implementation Review Mode

Called from `/execute` Phase 3.5 after implementation and verification are complete.

### 1. Locate the Approved Designs

Read the plan file for UI Design References. For each mockup file listed, identify which implementation file(s) correspond to it (typically the plan's FILE STRUCTURE table makes this clear).

### 2. If Browser MCP Available: Render the Implementation

- Use the browser MCP to navigate to the running implementation (dev server URL, usually localhost:3000 / localhost:5173 / similar — check the plan's validation commands or the project's dev script)
- Take screenshots of each UI surface that has a mockup
- Resize to relevant viewports if the design is responsive

### 3. Subagent Review

Dispatch a `ui-reviewer` subagent using the same template with:

- `{REVIEW_MODE}` → `implementation`
- `{FEATURE_NAME}` → the feature name
- `{APPROVED_DESIGN_FILES}` → paths to the approved mockups in `designs/<feature-name>/`
- `{IMPLEMENTATION_FILES}` → paths to the implementation files (HTML, JSX, Vue, Svelte, etc.)
- `{DESIGN_CONTEXT}` → same context as design mode
- `{SCREENSHOT_AVAILABLE}` → `true` or `false`
- `{MOCKUP_FILES}` → leave blank (use `APPROVED_DESIGN_FILES` instead)

The subagent checks: **does the implementation match the approved design?** — layout, spacing, colors, typography, interactions, responsive behavior.

### 4. Loop Until Approved

- On Critical / Important findings: fix the implementation code, re-run verification commands (they must still pass), re-dispatch the subagent
- Minor findings: fix silently
- Max 5 iterations. If still not approved: stop, summarize remaining issues, ask the user for guidance
- Once approved: return control to `/execute` Phase 4 (Code Review)

---

## What This Skill Does NOT Do

- Does not replace the brainstorming phase — conceptual design decisions happen there, not here
- Does not write the implementation plan — it produces mockups that the plan references
- Does not write production code — only HTML mockup files
- Does not run user-facing approval on Minor issues — those are fixed silently
- Does not overlap with the brainstorming visual companion — that tool helps the user *decide* between approaches during brainstorming; this skill produces the *specification* the implementation must match

## Key Principles

- **Self-contained mockups** — the user must be able to double-click and see the design, no setup required
- **High fidelity, not wireframe** — mockups must look like the final product, not like sketches
- **Two gates** in design mode — subagent approval AND user approval. Neither alone is sufficient.
- **One gate** in implementation review — subagent approval (the user already approved the design)
- **Designs are documentation** — they go in git, serving as the approved specification forever after
- **Degrade gracefully** — without a browser MCP, code analysis still produces useful review; with one, review is stronger
