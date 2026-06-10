#!/usr/bin/env bash
# Claude Code status line script
# Format: Model (context) | effort:level | ctx:▓▓▓░░ N% | 5h:▓▓▓░░ N% | 7d:▓▓▓░░ N% | ~/dir | branch

# ANSI color codes
CYAN_BOLD='\033[1;96m'
MAGENTA='\033[35m'
BLUE='\033[94m'
DIM='\033[90m'
RESET='\033[0m'

# Read JSON input from stdin
input=$(cat)

# --- Model display name and context window ---
model_id=$(echo "$input" | jq -r '.model.id // ""')
model_display=$(echo "$input" | jq -r '.model.display_name // ""')

# Map model ID to friendly short name
case "$model_id" in
  *claude-opus-4-7*|*opus-4-7*)   friendly="Opus 4.7" ;;
  *claude-opus-4-5*|*opus-4-5*)   friendly="Opus 4.5" ;;
  *claude-opus-4*)                  friendly="Opus 4" ;;
  *claude-sonnet-4-6*|*sonnet-4-6*) friendly="Sonnet 4.6" ;;
  *claude-sonnet-4-5*|*sonnet-4-5*) friendly="Sonnet 4.5" ;;
  *claude-sonnet-4*)                friendly="Sonnet 4" ;;
  *claude-haiku-4*|*haiku-4*)       friendly="Haiku 4" ;;
  *claude-opus-3-7*|*opus-3-7*)     friendly="Opus 3.7" ;;
  *claude-opus-3-5*|*opus-3-5*)     friendly="Opus 3.5" ;;
  *claude-sonnet-3-7*|*sonnet-3-7*) friendly="Sonnet 3.7" ;;
  *claude-sonnet-3-5*|*sonnet-3-5*) friendly="Sonnet 3.5" ;;
  *)
    # Fall back to display_name, strip leading "Claude " if present
    friendly=$(echo "$model_display" | sed 's/^[Cc]laude //')
    ;;
esac

# Derive context window label from context_window_size
ctx_size=$(echo "$input" | jq -r '.context_window.context_window_size // 0')
if   [ "$ctx_size" -ge 900000 ] 2>/dev/null; then ctx_label="1M context"
elif [ "$ctx_size" -ge 190000 ] 2>/dev/null; then ctx_label="200K context"
elif [ "$ctx_size" -ge 90000  ] 2>/dev/null; then ctx_label="100K context"
else ctx_label="${ctx_size} context"
fi

model_str="${friendly} (${ctx_label})"

# --- Effort level ---
effort=$(echo "$input" | jq -r '.effort.level // ""')

# --- Rate limit progress bars ---
# Build a 5-block progress bar from a percentage (0-100)
make_bar() {
  local pct="${1:-0}"
  # Round to integer
  local ipct
  ipct=$(printf '%.0f' "$pct" 2>/dev/null || echo 0)
  # Each block represents 20%
  local filled=$(( ipct / 20 ))
  local bar=""
  local i
  for i in 1 2 3 4 5; do
    if [ "$i" -le "$filled" ]; then
      bar="${bar}▓"
    else
      bar="${bar}░"
    fi
  done
  echo "$bar"
}

ctx_pct=$(echo "$input" | jq -r '.context_window.used_percentage // empty')
five_pct=$(echo "$input" | jq -r '.rate_limits.five_hour.used_percentage // empty')
seven_pct=$(echo "$input" | jq -r '.rate_limits.seven_day.used_percentage // empty')

if [ -n "$ctx_pct" ]; then
  ctx_bar=$(make_bar "$ctx_pct")
  ctx_int=$(printf '%.0f' "$ctx_pct")
  ctx_str="ctx:${ctx_bar} ${ctx_int}%"
else
  ctx_str="ctx:░░░░░ 0%"
fi

if [ -n "$five_pct" ]; then
  five_bar=$(make_bar "$five_pct")
  five_int=$(printf '%.0f' "$five_pct")
  five_str="5h:${five_bar} ${five_int}%"
else
  five_str="5h:░░░░░ 0%"
fi

if [ -n "$seven_pct" ]; then
  seven_bar=$(make_bar "$seven_pct")
  seven_int=$(printf '%.0f' "$seven_pct")
  seven_str="7d:${seven_bar} ${seven_int}%"
else
  seven_str="7d:░░░░░ 0%"
fi

# --- Git branch ---
cwd=$(echo "$input" | jq -r '.workspace.current_dir // .cwd // ""')
git_worktree=$(echo "$input" | jq -r '.workspace.git_worktree // ""')
if [ -n "$git_worktree" ]; then
  branch="$git_worktree"
elif [ -n "$cwd" ]; then
  branch=$(git -C "$cwd" branch --show-current 2>/dev/null)
fi
[ -z "$branch" ] && branch=$(git branch --show-current 2>/dev/null)

# --- Session directory (where the session was opened; abbreviate $HOME to ~) ---
session_dir=$(echo "$input" | jq -r '.workspace.project_dir // .workspace.current_dir // .cwd // ""')
dir_display="$session_dir"
# Abbreviate the home directory to ~ (case-based: robust against slashes in $HOME)
if [ -n "$session_dir" ] && [ -n "$HOME" ]; then
  case "$session_dir" in
    "$HOME")   dir_display="~" ;;
    "$HOME"/*) dir_display="~${session_dir#"$HOME"}" ;;
  esac
fi

# --- Assemble output ---
SEP="${DIM} | ${RESET}"

# Segment 1: model (cyan bold)
out="${CYAN_BOLD}${model_str}${RESET}"

# Segment 2: effort (magenta) — only if present
if [ -n "$effort" ]; then
  out="${out}${SEP}${MAGENTA}effort:${effort}${RESET}"
fi

# Segment 3: context-window usage (current session)
out="${out}${SEP}${ctx_str}"

# Segment 4: 5h usage
out="${out}${SEP}${five_str}"

# Segment 5: 7d usage
out="${out}${SEP}${seven_str}"

# Segment 6: session directory (blue)
if [ -n "$dir_display" ]; then
  out="${out}${SEP}${BLUE}${dir_display}${RESET}"
fi

# Segment 7: git branch (white/default)
if [ -n "$branch" ]; then
  out="${out}${SEP}${branch}"
fi

printf "%b" "$out"
