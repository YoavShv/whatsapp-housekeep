---
description: "Create comprehensive feature plan with brainstorming, codebase analysis, and subagent review"
argument-hint: [feature-name]
---

# Plan a Feature

**Your role:** You are a software architect designing implementation plans through collaborative brainstorming and codebase analysis.

## Feature: $ARGUMENTS

## Mission

Transform a feature request into a **comprehensive implementation plan** through collaborative brainstorming, systematic codebase analysis, and plan review.

**Core Principle**: We do NOT write code in this phase. Our goal is to create a context-rich implementation plan that enables one-pass implementation success.

**Methodology**: Plans follow Test-Driven Development (TDD). Every task uses the RED-GREEN-REFACTOR cycle: write a failing test first, implement the minimum code to pass it, then clean up.

**Principles**: DRY — no duplicated logic. YAGNI — only build what the spec requires, nothing speculative. Frequent commits — commit after each completed task.

---

## Phase 1: Brainstorming

**Before writing any plan, understand what we're building through collaborative dialogue.**

This phase follows the brainstorming skill principles:

### 1. Explore Context

- Check current project state (files, docs, recent commits)
- Read `.ai/AGENTS.md` for project conventions
- Understand what exists and what's been built so far

### 2. Assess Scope

- If the feature describes multiple independent subsystems, flag this immediately
- If too large for a single plan, help decompose into sub-features — each gets its own plan → execute cycle

### 3. Ask Clarifying Questions

- One question at a time
- Prefer multiple choice when possible
- Focus on: purpose, constraints, success criteria
- Resolve ambiguities before proceeding

### 4. Propose Approaches

- Present 2-3 different approaches with trade-offs
- Lead with your recommended option and reasoning

### 5. Present Design

- Scale each section to its complexity
- Ask after each section: does this look right?
- Cover: architecture, components, data flow, error handling, testing
- Get user approval before proceeding to Phase 2

**Do NOT proceed to Phase 2 until the user approves the design.**

---

## Phase 1.5: UI Design (if applicable)

**If this feature involves UI components (pages, layouts, forms, dashboards, visualizations):**

1. Confirm with the user: "This feature involves UI — I'll create high-fidelity HTML mockups and have them reviewed before writing the plan. Correct?"
2. If confirmed, invoke the `ui-design` skill in **design mode**. The skill handles:
   - MCP discovery (first time only)
   - Creating HTML mockup(s) in `designs/<feature-name>/`
   - Subagent review loop (until a ui-reviewer subagent approves)
   - User approval (user opens mockup in browser, receives design rationale summary, approves or requests changes)
3. Do NOT proceed to Phase 2 until the user has approved the mockup.

**If the feature has no UI components**, skip directly to Phase 2.

The approved mockup files (in `designs/<feature-name>/`) will be referenced in the plan document (Phase 4) as design specifications. They are the spec that implementation must match, and will be re-used during `/execute` Phase 3.5 for implementation review.

---

## Phase 2: Codebase Intelligence Gathering

**Use subagents for research when beneficial. The main agent coordinates.**

### 1. Project Structure Analysis

- Map directory structure and architectural patterns
- Identify service/component boundaries and integration points
- Locate configuration files
- Find environment setup and build processes

### 2. Pattern Recognition

- Search for similar implementations in codebase
- Identify coding conventions (naming, structure, error handling, logging)
- Extract common patterns for the feature's domain
- Check `.ai/AGENTS.md` and `.ai/reference/*.md` for project-specific rules

### 3. Dependency Analysis

- Catalog external libraries relevant to feature
- Understand how libraries are integrated
- Find relevant documentation
- Note library versions and compatibility requirements

### 4. Testing Patterns

- Identify test framework and structure
- Find similar test examples for reference
- Understand test organization (unit vs integration vs devtest)
- Note testing strategy from `.ai/AGENTS.md`

### 5. Integration Points

- Identify existing files that need updates
- Determine new files that need creation and their locations
- Map router/API registration patterns
- Understand database/model patterns if applicable

---

## Phase 3: External Research

**Use subagents for external research when beneficial:**

- Research latest library versions and best practices
- Find official documentation with specific section anchors
- Locate implementation examples
- Identify common gotchas and known issues

---

## Phase 4: Plan Writing

### File Structure Mapping

**Before defining tasks, map ALL files that will be created or modified:**

- Design units with clear boundaries and well-defined interfaces
- Each file should have one clear responsibility
- Prefer smaller, focused files over large ones
- In existing codebases, follow established patterns

### Plan Document

**Save to**: `.ai/plans/{kebab-case-feature-name}.md`

Create the `.ai/plans/` directory if it doesn't exist.

**The plan document must use this structure:**

````markdown
---
status: planned
feature: <feature-name>
created: <YYYY-MM-DD>
branch: feature/<feature-name>
---

# Feature: <feature-name>

> **To implement:** Run `/execute .ai/plans/<filename>.md`

## Feature Description

<Detailed description of the feature, its purpose, and value to users>

## User Story

As a <type of user>
I want to <action/goal>
So that <benefit/value>

## Design Summary

<Brief summary of the design agreed during brainstorming — the approach chosen and why>

## Feature Metadata

**Feature Type**: [New Capability/Enhancement/Refactor/Bug Fix]
**Estimated Complexity**: [Low/Medium/High]
**Primary Systems Affected**: [List of main components/services]
**Dependencies**: [External libraries or services required]

---

## CONTEXT REFERENCES

### Relevant Codebase Files — READ BEFORE IMPLEMENTING

- `path/to/file.py` (lines 15-45) - Why: Contains pattern for X that we'll mirror
- `path/to/test.py` - Why: Test pattern example

### Relevant Documentation

- [Documentation Link](https://example.com/doc#section)
  - Specific section and why it's needed

### Patterns to Follow

<Specific patterns extracted from codebase — include actual code examples from the project>

---

## FILE STRUCTURE

| Action | File | Responsibility |
|--------|------|---------------|
| Create | `exact/path/to/file.py` | <one-line description> |
| Create | `tests/exact/path/to/test_file.py` | <tests for what> |
| Modify | `exact/path/to/existing.py:lines` | <what changes> |

### UI Design References (include only if this feature has UI)

These mockups were approved in Phase 1.5 and serve as the visual specification. Implementation must match them. They will be used by `/execute` Phase 3.5 for post-implementation UI review.

| Design File | Implements |
|-------------|------------|
| `designs/<feature-name>/<page-name>.html` | <one-line description of what this mockup specifies> |

---

## STEP-BY-STEP TASKS (TDD)

Execute every task in order, top to bottom. Each task follows RED-GREEN-REFACTOR. Each step is one action. DRY — no duplicated logic. YAGNI — only build what is specified.

### Task N: [Component Name]

**Files:**
- Create: `exact/path/to/file.py`
- Modify: `exact/path/to/existing.py:123-145`
- Test: `tests/exact/path/to/test_file.py`

- [ ] **Step 1: Write the failing test**

Tests MUST include both happy path AND edge cases. For every function under test, systematically consider:

| Category | What to test |
|----------|-------------|
| **Boundaries** | Exact boundary values (off-by-one), zero, empty inputs, single-element inputs |
| **Overlaps** | When multiple conditions are true simultaneously — which takes priority? |
| **Inverses** | Just inside vs. just outside a threshold (e.g., day 6 vs. day 7 for a 7-day window) |
| **Extremes** | Empty sets/arrays, null/undefined (if the type allows), very large inputs |

Organize tests with a `// --- Edge cases ---` separator after the happy path tests.

```<language>
# Happy path
def test_specific_behavior():
    result = function(input)
    assert result == expected

# --- Edge cases ---
def test_boundary_exactly_at_threshold():
    ...
def test_overlap_between_two_states():
    ...
```

- [ ] **Step 2: Run test to verify it fails**

Run: `<test command> tests/path/test.py::test_name -v`
Expected: FAIL with "<specific error>"

- [ ] **Step 3: Write minimal implementation**

```<language>
def function(input):
    return expected
```

- [ ] **Step 4: Run test to verify it passes**

Run: `<test command> tests/path/test.py::test_name -v`
Expected: PASS

- [ ] **Step 5: Commit**

Use `/commit` to stage and commit the changes from this task.

<Repeat TDD cycle for each task.>

---

## VALIDATION COMMANDS

Execute every command to ensure zero regressions and 100% feature correctness.

### Level 1: Syntax & Style
<Project-specific linting and formatting commands>

### Level 2: Unit Tests
<Project-specific unit test commands>

### Level 3: Integration Tests
<Project-specific integration test commands>

### Level 4: Manual Validation
<Feature-specific manual testing steps>

---

## ACCEPTANCE CRITERIA

- [ ] Feature implements all specified functionality
- [ ] All validation commands pass with zero errors
- [ ] All TDD cycles completed (each task has passing tests)
- [ ] Code follows project conventions and patterns
- [ ] No regressions in existing functionality
- [ ] Code has meaningful comments explaining WHY

---

## NOTES

<Additional context, design decisions, trade-offs>
````

### Worktree Reminder

After writing the plan, include this note:

> **Tip:** If you are planning multiple features simultaneously, consider using git worktrees to isolate each feature's work. See the `using-git-worktrees` skill for setup instructions.

---

## Phase 5: Plan Review (Subagent)

After writing the plan, dispatch a subagent to review it.

### Plan Reviewer Subagent Prompt

Dispatch a general-purpose subagent with the following prompt:

```
You are a plan document reviewer. Verify this implementation plan is complete and ready for execution.

**Plan to review:** [PLAN_FILE_PATH]
**Project conventions:** Read `.ai/AGENTS.md`
**PRD for reference:** Read `PRD.md` (if exists)

## What to Check

| Category | What to Look For |
|----------|------------------|
| Completeness | TODOs, placeholders, incomplete tasks, missing steps |
| Design Alignment | Plan covers everything from the Design Summary section |
| Task Decomposition | Tasks are atomic, clear boundaries, steps are actionable |
| TDD Compliance | Every task starts with a failing test, then implementation |
| File Structure | Files have clear single responsibilities |
| File Paths | All paths are accurate and exist (or are clearly marked as new) |
| Context References | Specific file:line references, not vague pointers |
| Validation Commands | Concrete, runnable commands with expected output |
| YAGNI | No tasks that implement features not in the design |
| Testing Strategy | Unit tests per function, devtests for features (per AGENTS.md) |

## CRITICAL — Look especially hard for:
- Any TODO markers or placeholder text
- Steps that say "similar to X" without actual content
- Missing verification steps or expected outputs
- Tasks that don't start with a failing test
- Scope creep beyond the agreed design

## Output Format

**Status:** Approved | Issues Found

### Issues (categorized by severity)

#### Critical (blocks execution)
- [Task X, Step Y]: [specific issue] — [why it matters]

#### Important (should fix before execution)
- [Task X, Step Y]: [specific issue] — [why it matters]

#### Minor (fix silently)
- [specific issue]

### Recommendations (advisory, don't block approval)
- [suggestions]
```

**The subagent returns:** Status + categorized findings (Critical / Important / Minor)

### Handling Review Results

**If Critical or Important issues found:**

Show findings to the user:

```
Plan review found [N] issues:
- [Critical/Important] <description of issue>
- [Critical/Important] <description of issue>

I can fix these. Would you like to:
a) Review each fix before I apply it
b) Let me fix them all and re-review automatically
```

Wait for user's choice. Fix issues, then re-submit to subagent reviewer. Loop until clean (max 5 iterations — if not resolved, ask user for guidance).

**If only Minor issues found:**

Fix silently, no re-review needed.

**If clean:**

Proceed to handoff.

---

## Execution Handoff

After the plan is reviewed and approved:

1. Ask the user to review the plan: "Please review the plan at `.ai/plans/<filename>.md`. Once you approve, I'll commit it to git."
2. **After user approval:** Use `/commit` to commit the plan file.
3. Tell the user: **"Plan committed. Run `/execute .ai/plans/<filename>.md` to start implementation."**

Do NOT auto-start execution — wait for the user to invoke it.

---

## Quality Criteria

### Context Completeness
- [ ] All necessary patterns identified and documented
- [ ] External library usage documented with links
- [ ] Integration points clearly mapped
- [ ] Every task has executable validation command

### Implementation Ready
- [ ] Another developer could execute without additional context
- [ ] Tasks ordered by dependency (can execute top-to-bottom)
- [ ] Each task follows TDD cycle (test first, then implement)
- [ ] Pattern references include specific file:line numbers

### Pattern Consistency
- [ ] Tasks follow existing codebase conventions
- [ ] New patterns justified with clear rationale
- [ ] No reinvention of existing patterns or utils
- [ ] Testing approach matches project standards

## Report

After creating the plan, provide:

- Summary of feature and approach
- Full path to created plan file
- Complexity assessment
- Key implementation risks or considerations
- Confidence score (#/10) for one-pass success
