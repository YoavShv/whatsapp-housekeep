#!/usr/bin/env bash
# Helper for the /orient slash command.
#
# Why this file exists: Claude Code's slash-command permission analyzer
# rejects complex bash (for-loops, $(...) substitution, nested quotes) when
# embedded directly in `!`...`` blocks inside the .md command file. orient.md
# therefore uses plain prose to instruct Claude to invoke this script via
# the Bash tool — that path uses settings.local.json's allowlist instead of
# the static analyzer, so a single `Bash(bash .claude/commands/orient/data.sh)`
# entry covers it cleanly.
#
# Output contract: prints `MODE: TEMPLATE` or `MODE: DERIVATIVE` on the first
# line, then (in TEMPLATE mode) labeled sections that orient.md parses to
# compose its report.

set -euo pipefail

# Anchor to the repo root regardless of caller's CWD.
cd "$(git rev-parse --show-toplevel)"

# Entry guard: PRD.md at the repo root means /create-prd has run → derivative.
if [ -f PRD.md ]; then
  echo "MODE: DERIVATIVE"
  exit 0
fi

echo "MODE: TEMPLATE"

# --- Commands inventory -------------------------------------------------
echo
echo "=== COMMANDS ==="
for f in .claude/commands/*.md; do
  name=$(basename "$f" .md)
  desc=$(awk '/^description:/{sub(/^description: */,""); gsub(/^"/,""); gsub(/"$/,""); print; exit}' "$f")
  printf '| /%s | %s |\n' "$name" "$desc"
done

# --- Enabled skills -----------------------------------------------------
echo
echo "=== SKILLS_ENABLED ==="
for f in .claude/skills/*/SKILL.md; do
  [ -f "$f" ] || continue
  name=$(awk '/^name:/{sub(/^name: */,""); print; exit}' "$f")
  desc=$(awk '/^description:/{sub(/^description: */,""); gsub(/^"/,""); gsub(/"$/,""); print; exit}' "$f")
  printf '| %s | %s |\n' "$name" "$desc"
done

# --- Parked skills ------------------------------------------------------
echo
echo "=== SKILLS_PARKED ==="
if [ -d .claude/skills-disabled ]; then
  for f in .claude/skills-disabled/*/SKILL.md; do
    [ -f "$f" ] || continue
    name=$(awk '/^name:/{sub(/^name: */,""); print; exit}' "$f")
    desc=$(awk '/^description:/{sub(/^description: */,""); gsub(/^"/,""); gsub(/"$/,""); print; exit}' "$f")
    printf '| %s | %s |\n' "$name" "$desc"
  done
fi

# --- MCP servers --------------------------------------------------------
echo
echo "=== MCP_SERVERS ==="
if [ -f .mcp.json ]; then
  jq -r '.mcpServers // {} | to_entries[] | "| \(.key) | `\(.value.command) \(.value.args // [] | join(" "))` |"' .mcp.json
fi

# --- Dev Container Features --------------------------------------------
# devcontainer.json uses JSON5-style line comments — strip them before jq.
echo
echo "=== FEATURES ==="
if [ -f .devcontainer/devcontainer.json ]; then
  grep -v '^[[:space:]]*//' .devcontainer/devcontainer.json \
    | jq -r '.features // {} | to_entries[] | "- \(.key | sub(".*/"; "")) (version \(.value.version // "default"))"'
fi

# --- Placeholder files (intentional stubs) -----------------------------
echo
echo "=== PLACEHOLDERS ==="
for f in .claude/PRD.md .ai/AGENTS.md .ai/reference/*.md; do
  [ -f "$f" ] && grep -l "place holder" "$f" 2>/dev/null || true
done

# --- Recent commits -----------------------------------------------------
echo
echo "=== RECENT_COMMITS ==="
git log --oneline -5
