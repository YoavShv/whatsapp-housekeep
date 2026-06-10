"""Reflector — the *reasoning* half of the self-improving Stop hook.

`propose-doc-review.py` (the hook) does the cheap, deterministic part: notice
that something governed changed. This file does the expensive part the article
actually describes:

    "A stop hook can reflect on what happened during a session and propose
     CLAUDE.md updates while the context is fresh."

It gathers the session's working-tree diff plus the current content of every
instruction doc that governs the changed code, asks Claude (headless `claude -p`)
to judge whether those conventions still hold, and writes the proposal to
`.claude/doc-review.md`.

This template adapts Helpline's `reflect_claude_md.py` to our doc layout: it
reflects on the central docs (root `CLAUDE.md`, `.ai/AGENTS.md`,
`.ai/reference/*.md`) for repo-level changes, and on any scattered
`CLAUDE.md` for changes inside a directory that carries one — the "Hybrid" model.

Because it makes an LLM call (slow), the hook spawns this in the background.
It can also be run directly for a synchronous reflection — that is what the
smoke tests use:

    python3 .claude/hooks/reflect-doc-review.py

Two safety properties:
  * Recursion guard — the headless `claude` it spawns would fire its own Stop
    hook, which would spawn another reflection, forever. The `claude` child is
    launched with AILAYER_DOC_REFLECT_LOCK=1; both this file and the hook no-op
    when that variable is set.
  * Graceful fallback — if the `claude` CLI is missing or the call fails, it
    writes a deterministic "re-check these docs" note instead, so the AI Layer
    still flags drift without the model.
"""

from __future__ import annotations

import os
import shutil
import subprocess
import sys
from datetime import datetime
from pathlib import Path

_EXCLUDE_DIRS = frozenset({
    ".git", ".venv", "venv", "env", "node_modules", "__pycache__",
    ".pytest_cache", ".mypy_cache", ".ruff_cache", "build", "dist", ".serena",
})
_REVIEW_FILE = ".claude/doc-review.md"
_STATE_FILE = ".claude/.doc-review-state"
_LOCK_ENV = "AILAYER_DOC_REFLECT_LOCK"
_CENTRAL_DOC_CANDIDATES = ("CLAUDE.md", ".ai/AGENTS.md")
_NOISE = frozenset({_STATE_FILE, _REVIEW_FILE})
_MAX_DIFF_CHARS = 12_000
_CLAUDE_TIMEOUT = 180


def _force_utf8() -> None:
    """Emit UTF-8 regardless of the Windows console code page — reflections
    contain em-dashes, arrows, and smart quotes that cp1252 would mangle."""
    for stream in (sys.stdout, sys.stderr):
        reconfigure = getattr(stream, "reconfigure", None)
        if callable(reconfigure):
            try:
                reconfigure(encoding="utf-8")
            except (OSError, ValueError):
                pass


def _project_root() -> Path:
    """Repo root — the dir Claude Code passes, or two levels up from this file."""
    project = os.environ.get("CLAUDE_PROJECT_DIR")
    return Path(project) if project else Path(__file__).resolve().parents[2]


def _git(args: list[str], root: Path, timeout: int = 10) -> str:
    try:
        result = subprocess.run(
            ["git", *args],
            cwd=root,
            capture_output=True,
            text=True,
            encoding="utf-8",
            errors="replace",
            timeout=timeout,
        )
    except (OSError, subprocess.SubprocessError):
        return ""
    return result.stdout


def _changed_paths(root: Path) -> list[str]:
    paths: list[str] = []
    for line in _git(["status", "--porcelain"], root).splitlines():
        if len(line) <= 3:
            continue
        path = line[3:].strip().replace("\\", "/")
        if path and path not in _NOISE:
            paths.append(path)
    return paths


def _scattered_areas(root: Path) -> set[str]:
    """Every non-root directory that carries its own CLAUDE.md. Layout-agnostic,
    so the reflector works in any repo, not just one shaped like this template."""
    areas: set[str] = set()
    for dirpath, dirnames, filenames in os.walk(root):
        dirnames[:] = [d for d in dirnames if d not in _EXCLUDE_DIRS]
        if "CLAUDE.md" in filenames:
            rel = Path(dirpath).relative_to(root).as_posix()
            if rel != ".":
                areas.add(rel)
    return areas


def _central_docs(root: Path) -> list[str]:
    """The central instruction docs that exist in this repo, relative posix."""
    docs: list[str] = []
    for rel in _CENTRAL_DOC_CANDIDATES:
        if (root / rel).is_file():
            docs.append(rel)
    ref_dir = root / ".ai" / "reference"
    if ref_dir.is_dir():
        for path in sorted(ref_dir.glob("*.md")):
            docs.append(path.relative_to(root).as_posix())
    return docs


def _area_of(changed: str, areas: set[str]) -> str | None:
    """The nearest scattered-CLAUDE.md directory containing a changed file."""
    parts = changed.split("/")
    for depth in range(len(parts) - 1, 0, -1):
        candidate = "/".join(parts[:depth])
        if candidate in areas:
            return candidate
    return None


def _touched(root: Path) -> tuple[dict[str, int], list[str], bool]:
    """Attribute each changed file to its governing doc. Returns
    (touched_scattered{area: file count}, root_files, root_touched)."""
    scattered = _scattered_areas(root)
    has_central = bool(_central_docs(root))
    touched_scattered: dict[str, int] = {}
    root_files: list[str] = []
    for path in _changed_paths(root):
        area = _area_of(path, scattered)
        if area is not None:
            touched_scattered[area] = touched_scattered.get(area, 0) + 1
        else:
            root_files.append(path)
    root_touched = bool(root_files) and has_central
    return touched_scattered, root_files, root_touched


def _diff_paths(touched_scattered: dict[str, int], root_files: list[str], root_touched: bool) -> list[str]:
    paths = sorted(touched_scattered)
    if root_touched:
        paths.extend(sorted(root_files))
    return paths


def _doc_block(root: Path, rel: str) -> str:
    """Render one instruction doc for the prompt."""
    path = root / rel
    content = (
        path.read_text(encoding="utf-8")
        if path.is_file()
        else "(this doc does not exist yet)"
    )
    return f"### {rel}\n\n{content}"


def _governing_docs(root: Path, touched_scattered: dict[str, int], root_touched: bool) -> list[str]:
    """The relative paths of every instruction doc the reflection should weigh:
    the central docs (if the repo root was touched) plus each touched area's
    own CLAUDE.md."""
    docs: list[str] = []
    if root_touched:
        docs.extend(_central_docs(root))
    for area in sorted(touched_scattered):
        docs.append(f"{area}/CLAUDE.md")
    return docs


def _build_prompt(root: Path, docs: list[str], diff: str) -> str:
    """Assemble a self-contained reflection prompt — no tools needed."""
    current = "\n\n".join(_doc_block(root, rel) for rel in docs)

    return f"""You are auditing whether a codebase's AI instruction docs still \
match reality after a coding session. These docs (CLAUDE.md, AGENTS.md, and \
their reference files) are what an AI coding agent loads to learn the repo's \
conventions, commands, and gotchas.

Below is the git diff of the session's uncommitted changes, then the current \
content of every instruction doc that governs the code that changed.

For EACH doc, output exactly one of:
- `No change needed` — the doc still holds; or
- a concrete proposed edit: the specific line(s) to add, change, or remove, \
plus one sentence on why.

Only propose an update when the diff introduces a genuine new convention, \
gotcha, command, or constraint that the doc does not yet capture. Do not \
propose stylistic rewrites. Be terse. Respond in plain text; do not use tools.

## Git diff (uncommitted work this session)

```diff
{diff}
```

## Current instruction doc(s)

{current}
"""


def _run_claude(prompt: str, root: Path) -> str | None:
    """Call headless `claude -p`. Returns the reflection text, or None on failure."""
    claude = shutil.which("claude")
    if not claude:
        return None

    env = dict(os.environ)
    env[_LOCK_ENV] = "1"  # recursion guard for the nested claude's own Stop hook

    try:
        result = subprocess.run(
            [claude, "-p", "--output-format", "text"],
            cwd=root,
            input=prompt,
            capture_output=True,
            text=True,
            encoding="utf-8",
            errors="replace",
            timeout=_CLAUDE_TIMEOUT,
            env=env,
        )
    except (OSError, subprocess.SubprocessError):
        return None
    if result.returncode != 0:
        return None
    return result.stdout.strip() or None


def _deterministic_note(root: Path, docs: list[str], stamp: str) -> str:
    """Fallback body when `claude` is unavailable — flag docs, no LLM."""
    lines = [
        f"# Doc review — {stamp}",
        "",
        "_`claude` CLI unavailable — deterministic fallback. The instruction "
        "docs below govern code that changed this session; re-check each by "
        "hand._",
        "",
    ]
    for rel in docs:
        if (root / rel).is_file():
            lines.append(f"- **{rel}** — do its conventions still hold after this session's changes?")
        else:
            lines.append(f"- **{rel}** — referenced but missing; consider adding it.")
    return "\n".join(lines) + "\n"


def reflect() -> int:
    _force_utf8()

    # Recursion guard: if we are already inside a reflection-spawned `claude`,
    # do nothing — this is what stops the Stop hook from looping forever.
    if os.environ.get(_LOCK_ENV):
        return 0

    root = _project_root()
    touched_scattered, root_files, root_touched = _touched(root)
    if not touched_scattered and not root_touched:
        return 0

    docs = _governing_docs(root, touched_scattered, root_touched)
    if not docs:
        return 0

    # Scope the diff to the touched paths — a whole-repo `git diff` would drown
    # the real change in unrelated noise (and blow the truncation budget).
    paths = _diff_paths(touched_scattered, root_files, root_touched)
    diff = _git(["diff", "HEAD", "--", *paths], root)
    if len(diff) > _MAX_DIFF_CHARS:
        diff = diff[:_MAX_DIFF_CHARS] + "\n... (diff truncated for the reflection)"

    stamp = datetime.now().isoformat(timespec="seconds")
    reflection = (
        _run_claude(_build_prompt(root, docs, diff), root) if diff.strip() else None
    )

    if reflection:
        body = (
            f"# Doc review — {stamp}\n\n"
            f"_Reflection by `claude -p` over {len(docs)} governing doc(s): "
            f"{', '.join(docs)}._\n\n"
            f"{reflection}\n"
        )
        mode = "LLM reflection"
    else:
        body = _deterministic_note(root, docs, stamp)
        mode = "deterministic fallback"

    review = root / _REVIEW_FILE
    try:
        review.parent.mkdir(parents=True, exist_ok=True)
        review.write_text(body, encoding="utf-8")
    except OSError as exc:
        print(f"[reflector] could not write {_REVIEW_FILE}: {exc}", file=sys.stderr)
        return 1

    print(f"[reflector] wrote {_REVIEW_FILE} ({mode})", file=sys.stderr)
    return 0


if __name__ == "__main__":
    sys.exit(reflect())
