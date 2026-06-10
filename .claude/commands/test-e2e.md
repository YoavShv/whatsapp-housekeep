---
description: Run the Playwright E2E test suite (optionally filtered) and report results
argument-hint: [spec-filter]
---

# Run E2E Tests

**Your role:** You are a test runner. Execute the suite, summarize results, surface failures clearly.

## Step 1: Ensure dev server is reachable

The project's `playwright.config.ts` is configured with `webServer.reuseExistingServer: true`, so Playwright will start one if needed. You don't have to start it manually — but check first so the user sees fast feedback:

```bash
lsof -ti:3000 2>/dev/null && echo "dev server up" || echo "Playwright will start one"
```

## Step 2: Run the suite

The user can pass an optional filter as `$ARGUMENTS` (e.g. `/test-e2e calendar` → runs only specs whose path matches `calendar`).

```bash
# With filter:
npx playwright test "$ARGUMENTS" --project=desktop

# Without filter, run everything (both desktop + mobile projects):
npm run test:e2e
```

Pick the form based on whether `$ARGUMENTS` is non-empty.

## Step 3: Report

**On success:** State the result with evidence — `N passed`, run time, project breakdown.

**On failure:** Do NOT just say "tests failed." Open the report and surface specifics:

1. The HTML report is at `playwright-report/index.html`
2. Failure screenshots are at `test-results/**/test-failed-*.png` — read each via the Read tool and attach inline so the user sees what broke
3. The error context markdown for each failed test is at `test-results/**/error-context.md` — read and quote the key error lines

Example failure summary:
> 1 failed, 7 passed. Failure was `calendar-selection › weekday-only` — locator `gridcell[24 במאי 2026]` not found. Screenshot attached.

## Step 4: Always sweep TEST_USER_ residue

Run this regardless of pass/fail to clean up any test users left over by crashed tests:

```bash
node --env-file=.env.local scripts/cleanup-test-users.mjs
```

Quote its output verbatim — "Deleted N test users" or "No TEST_USER_ rows found. Already clean."

## Notes

- E2E specs live in `tests/e2e/`. Specs use `tests/e2e/helpers/test-user.ts` to create + clean up a fresh `TEST_USER_`-prefixed resident per test.
- TZ is pinned to `Asia/Jerusalem` in `playwright.config.ts` to match production.
- Two projects: `desktop` (Chromium) and `mobile` (iPhone 14 emulation). The default `npm run test:e2e` runs both; pass `--project=desktop` to skip mobile for faster iteration.
- The full configuration rationale is in `.ai/plans/wondrous-brewing-rossum.md`.
