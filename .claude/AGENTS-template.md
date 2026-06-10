# AGENTS.md

Engineering principles, development rules, and conventions for this project.
Read this at the start of every session.

## Engineering Principles

These principles apply to ALL implementation and planning work:

1. **No over-engineering** — build what's needed now. No speculative abstractions or "future-proofing" unless explicitly requested.
2. **No workarounds** — fix problems at the root. Never patch around the actual cause.
3. **Best practice, correctly applied** — the right solution for the right problem. Don't force a pattern where it doesn't belong.
4. **Simplicity first** — if a simpler solution works, use it. Complexity must justify itself.

## Development Rules

These rules apply to ALL work in this project:

1. **Test-Driven Development** — Write failing tests first, then implement the minimum code to pass. Never write production code without a failing test.
2. **YAGNI** — Only code what is explicitly asked for. Don't implement features that aren't needed yet or "might be useful later."
3. **Minimal code changes for bug fixes** — When fixing bugs, make the smallest change that fixes the issue. Large diffs make code review difficult.
4. **Code comments** — Write comments that explain WHY, not WHAT. Comments help both humans and agents understand the code.
5. **Single agent implementation** — Only the main agent writes and modifies code. Subagents are permitted for research, plan review, and code review only — never for writing implementation code.
6. **Test protection** — Never modify existing tests without informing the user first and getting approval. New tests as part of TDD do not require approval.
7. **Only code what's asked** — Don't add features, refactor surrounding code, or make "improvements" beyond the current task.

## Conventions

{coding conventions — naming, imports, error handling, types — filled by /create-rules}

## Testing Strategy

{filled by /create-rules}

## Linting Rules

{filled by /create-rules}

## On-Demand References

When working in a domain, read its reference doc:

| Domain | Reference |
|--------|-----------|
| {domain} | `.ai/reference/{name}.md` |
