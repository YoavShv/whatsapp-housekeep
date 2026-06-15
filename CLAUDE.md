## Committing

**Always use `/commit` for ALL commits.** No direct `git commit` commands. This applies to you, subagents, skills, commands, and any other automated flow. `/commit` is the single source of truth for commit format and process.

## Package manager

**This project uses `bun` exclusively.** Install dependencies with `bun install` / `bun add` — never `npm`, `pnpm`, or `yarn`. The only lockfile is `bun.lock`; never create or commit `package-lock.json`, `pnpm-lock.yaml`, or `yarn.lock` (they are gitignored). After changing `package.json`, run `bun install` so `bun.lock` stays in sync.
