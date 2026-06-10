---
description: Execute an implementation plan with TDD, debugging, verification, code review, and branch management
argument-hint: [path-to-plan]
---

# Execute: Implement from Plan

**Your role:** You are a disciplined implementation engineer executing plans with TDD rigor and systematic verification.

Read plan file: `$ARGUMENTS`

---

## Phase 1: Setup

### 1. Read and Review Plan

- Read the ENTIRE plan carefully
- Understand all tasks and their dependencies
- Note the validation commands
- Review the testing strategy
- Read `.ai/AGENTS.md` for project rules if not already loaded
- Record the current base branch SHA for later code review:
  ```bash
  BASE_SHA=$(git rev-parse HEAD)
  ```

### 2. Update Plan Status

Update the plan's frontmatter:
```yaml
status: in-progress
```

### 3. Create Feature Branch

```bash
# Read branch name from plan frontmatter
git checkout -b <branch-from-plan-frontmatter>
```

If the plan doesn't specify a branch name, create one from the feature name: `feature/<kebab-case-feature-name>`

### 4. Verify Clean Baseline

Run the project's test suite to confirm everything passes before making changes:
```bash
# Use the test command from CLAUDE.md or the plan's validation commands
```

**If tests fail:** Report failures to the user. Do NOT proceed until baseline is clean or user explicitly approves.

---

## Phase 2: Implementation

**For EACH task in the plan, in order:**

### Development Rules (from .ai/AGENTS.md)

These rules apply to ALL work:

1. **Only the main agent writes code.** Subagents may be used for research only — never for implementation.
2. **Test-Driven Development.** Write failing test first, then implement the minimum code to pass it. Never write production code without a failing test.
3. **YAGNI.** Only code what the current task specifies. Don't add features, refactor surrounding code, or make "improvements" beyond the task.
4. **Code comments.** Write comments that explain WHY, not WHAT. Help humans and future agents understand the code.
5. **Minimal changes for bug fixes.** When fixing bugs, make the smallest change that fixes the issue.
6. **Test protection.** NEVER modify existing tests without informing the user first. New tests as part of TDD do not require approval.
7. **Only code what's asked.** Don't implement things that aren't needed yet.

### TDD Cycle (per task)

```
For each task:
  1. Write the failing test (from the plan)
  2. Run it — verify it FAILS for the expected reason
     - If it passes immediately: the test is wrong. Fix the test.
     - If it errors (not fails): fix the error, re-run until it fails correctly.
  3. Write the MINIMUM code to make the test pass
     - No extra features, no edge case handling beyond what's tested
     - Add comments explaining WHY where the logic isn't self-evident
  4. Run the test — verify it PASSES
     - If it fails: fix the implementation (NOT the test)
     - If other tests break: fix now, don't defer
  5. Refactor if needed
  6. Run the test suite — verify all tests still pass after refactoring
     - If any test fails: fix the refactored code, re-run until green
     - Do NOT commit until tests pass on the refactored code
  7. Commit (see commit format in "After Each Task" below)
  8. Update the plan file: check off completed steps (change `- [ ]` to `- [x]`)
```

### When a Test Fails Unexpectedly (Systematic Debugging)

If a test fails and the fix isn't obvious after reading the error:

**DO NOT guess. Follow this process:**

1. **Read the error carefully.** Stack trace, line numbers, error codes. The answer is often right there.
2. **Reproduce consistently.** Can you trigger it reliably?
3. **Check recent changes.** What did you just change that could cause this?
4. **Trace data flow.** Where does the bad value originate? Trace backward through the call stack.
5. **Form a single hypothesis.** "I think X is the root cause because Y."
6. **Test minimally.** Make the SMALLEST change to test your hypothesis. One variable at a time.

**If a fix doesn't work after 3 attempts:**
- STOP. Do not attempt fix #4.
- Inform the user: "I've tried 3 fixes for [issue]. Each revealed [what happened]. This may indicate an architectural problem rather than a simple bug."
- Wait for user guidance before continuing.

**Red flags — STOP and investigate properly:**
- "Quick fix for now, investigate later"
- "Just try changing X and see"
- "Add multiple changes, run tests"
- Proposing solutions before tracing data flow

### When Existing Tests Need Changing

**NEVER modify an existing test without informing the user first.**

If an existing test breaks or needs updating:
1. Investigate WHY it broke — is the implementation wrong, or is the test outdated?
2. Inform the user: "Existing test `test_name` in `file.py` is failing because [reason]. I recommend [fix the implementation / update the test] because [reasoning]."
3. Wait for user approval before changing the test.

New tests written as part of the current TDD cycle do NOT require approval.

### After Each Task

Use `/commit` to stage and commit changes from this task. Since tests were already verified in the TDD cycle above, the test verification step in `/commit` is considered satisfied — but follow all other `/commit` steps (review changes, detect logical units, stage specific files, conventional format, confirm).

---

## Phase 3: Verification

**After all tasks are complete, verify everything before claiming success.**

### The Iron Law: Evidence Before Claims

```
NO COMPLETION CLAIMS WITHOUT FRESH VERIFICATION EVIDENCE
```

If you haven't run the verification command in this step, you CANNOT claim it passes.

### Run ALL Validation Commands

Execute every validation command from the plan, in order:

1. **Syntax & Style** — linting, formatting
2. **Unit Tests** — full test suite
3. **Integration Tests** — if applicable
4. **Manual Validation** — feature-specific checks

For EACH command:
- Run it
- Read the FULL output
- Check exit code
- Report the actual result (not "should pass")

**If any command fails:**
- Fix the issue using systematic debugging (Phase 2 rules)
- Re-run the command
- Continue only when it passes

**Note:** If the plan's validation commands include e2e or browser-based testing, invoke the `e2e-test` skill as part of this verification phase.

### Verification Report

After all commands pass, report:
```
Verification complete:
- Linting: [PASS — output summary]
- Unit tests: [PASS — N tests, 0 failures]
- Integration tests: [PASS — output summary]
- Manual validation: [PASS — what was checked]
```

**Forbidden phrases:** "should pass", "looks correct", "probably works", "I'm confident"
**Required phrases:** "Output shows: [actual output]", "Exit code: 0", "N tests passed"

---

## Phase 3.5: UI Implementation Review (if applicable)

**If the plan's FILE STRUCTURE section includes UI Design References (mockup files in `designs/`):**

1. Invoke the `ui-design` skill in **implementation review mode**. The skill handles:
   - MCP discovery (first time only — if not done earlier in the session)
   - Rendering the implementation via browser MCP if available (taking screenshots)
   - Dispatching a `ui-reviewer` subagent with the approved mockup(s) AND the implementation files
   - Review loop: subagent findings → fix implementation → re-review until approved
2. Do NOT proceed to Phase 4 until the ui-reviewer subagent approves the implementation.
3. If any UI implementation fixes are made during this phase, re-run the validation commands from Phase 3 to confirm no regressions were introduced.

**If the plan has no UI Design References**, skip directly to Phase 4.

The design was already approved by the user during `/plan-feature` Phase 1.5. This phase only verifies that the implementation matches that approved design — it does not require a second user approval.

---

## Phase 4: Code Review

### Request Review (Subagent)

Use the code-reviewer prompt template at `.claude/skills/requesting-code-review/code-reviewer.md`.

```bash
HEAD_SHA=$(git rev-parse HEAD)
```

Dispatch a `superpowers:code-reviewer` subagent, filling the template placeholders:
- `{WHAT_WAS_IMPLEMENTED}` — summary of the feature
- `{PLAN_OR_REQUIREMENTS}` — path to the plan file
- `{BASE_SHA}` — the SHA recorded in Phase 1 Setup
- `{HEAD_SHA}` — current HEAD
- `{DESCRIPTION}` — brief summary of what was built

### Handle Review Feedback

When receiving review feedback, apply these principles:

1. **Verify before implementing.** Don't blindly agree. Check each suggestion against the codebase.
2. **Push back if wrong.** If the reviewer's suggestion breaks functionality, violates YAGNI, or is technically incorrect — push back with reasoning.
3. **Apply YAGNI to reviewer suggestions.** If the reviewer suggests adding features not in the plan, reject them.
4. **Fix one item at a time.** Test each fix individually.
5. **Clarify before implementing.** If any feedback item is unclear, ask rather than guess.

**Review feedback categories:**
- **Critical:** Fix immediately. Must be resolved before proceeding.
- **Important:** Fix before proceeding. Must be resolved.
- **Minor:** Fix silently. No re-review needed.

**Re-review loop:** After fixing Critical/Important issues, the subagent reviews again. Loop until clean.

---

## Phase 5: Finish Branch

### 1. Final Test Verification

Run the full test suite one last time:
```bash
# Full test command
```
All tests MUST pass. If any fail, fix before proceeding.

### 2. Present Options

```
Implementation complete. All tests pass. Code review approved.

What would you like to do?

1. Merge back to <base-branch> locally
2. Push and create a Pull Request
3. Keep the branch as-is (I'll handle it later)
4. Discard this work

Which option?
```

### 3. Execute Choice

**Option 1: Merge Locally**
```bash
git checkout <base-branch>
git pull
git merge <feature-branch>
# Run tests on merged result
# If tests pass:
git branch -d <feature-branch>
```
Update plan status: `status: completed`, `completed-date: <YYYY-MM-DD>`

**Option 2: Push and Create PR**
```bash
git push -u origin <feature-branch>
gh pr create --title "<title>" --body "$(cat <<'EOF'
## Summary
<2-3 bullets of what changed>

## Test Plan
- [ ] <verification steps>
EOF
)"
```
Report the PR URL.
Update plan status: `status: completed`, `completed-date: <YYYY-MM-DD>`

**Option 3: Keep As-Is**
Report: "Keeping branch `<name>`. You can return to it later."
Plan status stays `in-progress`.

**Option 4: Discard**
Confirm first:
```
This will permanently delete:
- Branch <name>
- All commits on this branch

Type 'discard' to confirm.
```
Wait for exact confirmation before deleting.
```bash
git checkout <base-branch>
git branch -D <feature-branch>
```
Update plan status: `status: discarded`, `discarded-date: <YYYY-MM-DD>`

### 4. Worktree Cleanup

If a git worktree was used (check with `git worktree list`):
- **Options 1, 2, 4:** Remove the worktree: `git worktree remove <worktree-path>`
- **Option 3:** Keep the worktree

---

## Error Handling Summary

| Situation | Action |
|-----------|--------|
| Test fails during TDD (expected) | Fix implementation, not the test |
| Test fails unexpectedly | Systematic debugging — trace root cause |
| 3+ fix attempts fail | STOP, inform user, question architecture |
| Existing test needs changing | Inform user, wait for approval |
| Validation command fails | Debug, fix, re-run until clean |
| Review finds Critical issue | Fix, re-review |
| Review suggests YAGNI violation | Push back with reasoning |
| Baseline tests fail at start | Report to user, don't proceed |

---

## Notes

- If you encounter issues not addressed in the plan, document them and inform the user
- If you need to deviate from the plan, explain why before proceeding
- Don't skip verification steps — evidence before claims, always
- Only the main agent writes code — use subagents for research and review only
