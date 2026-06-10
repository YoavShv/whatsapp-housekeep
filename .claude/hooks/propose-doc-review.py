"""Stop hook — the *trigger* half of the self-improving AI Layer.

Anthropic's large-codebases article: "a stop hook can reflect on what happened
during a session and propose CLAUDE.md updates while the context is fresh."
That reflection is an LLM call — too slow to block the end of every turn on.
So the work is split:

  * This file (the hook) does the cheap, deterministic part — notice which
    instruction docs the session's changes might affect, and decide whether a
    reflection is worth spawning.
  * `reflect-doc-review.py` (the reflector) does the LLM call that actually
    reflects and proposes concrete edits.

This is the base template's adaptation of Helpline's `propose_claude_md.py`.
Helpline keys off per-service `CLAUDE.md` files; our template centralizes rules
into root `CLAUDE.md` + `.ai/AGENTS.md` + `.ai/reference/*.md`. We watch
BOTH (the "Hybrid" model): the central docs always govern the repo root, and any
non-root directory that carries its own `CLAUDE.md` is governed Helpline-style —
so the hook keeps working whether a derivative centralizes or scatters its docs.

When something governed changed, this hook spawns the reflector in the
**background** and returns immediately; the reflector writes
`.claude/doc-review.md` a little after the turn ends.

Three guards keep it well-behaved:
  * Recursion guard — the reflector spawns a headless `claude` whose own Stop
    hook lands right back here; AILAYER_DOC_REFLECT_LOCK makes that a no-op.
  * Dedup — the Stop hook fires every turn, but the diff usually has not changed
    turn to turn; a fingerprint of the scoped `git diff HEAD` skips re-reflecting
    on a diff already handled.
  * Fallback — if `claude` is missing the reflector still runs and writes a
    deterministic note, so drift is flagged either way.

Portable across template copies: nothing here is specific to this repo's layout.

Tested standalone: `python3 .claude/hooks/propose-doc-review.py`
"""

from __future__ import annotations

import hashlib
import os
import subprocess
import sys
from pathlib import Path

_EXCLUDE_DIRS = frozenset({
    ".git", ".venv", "venv", "env", "node_modules", "__pycache__",
    ".pytest_cache", ".mypy_cache", ".ruff_cache", "build", "dist", ".serena",
})
_LOCK_ENV = "AILAYER_DOC_REFLECT_LOCK"
_STATE_FILE = ".claude/.doc-review-state"
_REVIEW_FILE = ".claude/doc-review.md"
_REFLECTOR = "reflect-doc-review.py"

# Generated artifacts that must never count as a "change" — writing the review
# file would otherwise re-trigger the hook on the next turn, forever.
_NOISE = frozenset({_STATE_FILE, _REVIEW_FILE})

# Central instruction docs (our convention). These govern the whole repo, so any
# repo-level change makes the root a candidate area for reflection.
_CENTRAL_DOC_CANDIDATES = ("CLAUDE.md", ".ai/AGENTS.md")

# Windows: detach the background reflector so it outlives this hook process.
_DETACHED_PROCESS = 0x00000008


def _force_utf8() -> None:
    """Emit UTF-8 regardless of the Windows console code page."""
    for stream in (sys.stdout, sys.stderr):
        reconfigure = getattr(stream, "reconfigure", None)
        if callable(reconfigure):
            try:
                reconfigure(encoding="utf-8")
            except (OSError, ValueError):
                pass


def _project_root() -> Path:
    project = os.environ.get("CLAUDE_PROJECT_DIR")
    return Path(project) if project else Path(__file__).resolve().parents[2]


def _git(args: list[str], root: Path) -> str:
    try:
        result = subprocess.run(
            ["git", *args],
            cwd=root,
            capture_output=True,
            text=True,
            encoding="utf-8",
            errors="replace",
            timeout=5,
        )
    except (OSError, subprocess.SubprocessError):
        return ""
    return result.stdout


def _changed_paths(root: Path) -> list[str]:
    """Working-tree changes, minus generated AI-Layer artifacts."""
    paths: list[str] = []
    for line in _git(["status", "--porcelain"], root).splitlines():
        if len(line) <= 3:
            continue
        path = line[3:].strip().replace("\\", "/")
        if path and path not in _NOISE:
            paths.append(path)
    return paths


def _scattered_areas(root: Path) -> set[str]:
    """Every non-root directory that carries its own CLAUDE.md (Helpline-style).
    Layout-agnostic, so the hook works in any repo, not just this template."""
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


def _touched(root: Path) -> tuple[set[str], list[str], bool]:
    """Attribute each changed file to its most specific governing doc.

    Returns (touched_scattered_areas, root_files, root_touched). A file inside a
    scattered area is attributed to that area; everything else falls to the repo
    root, which is governed by the central docs (when any exist)."""
    scattered = _scattered_areas(root)
    has_central = bool(_central_docs(root))
    touched_scattered: set[str] = set()
    root_files: list[str] = []
    for path in _changed_paths(root):
        area = _area_of(path, scattered)
        if area is not None:
            touched_scattered.add(area)
        else:
            root_files.append(path)
    root_touched = bool(root_files) and has_central
    return touched_scattered, root_files, root_touched


def _diff_paths(touched_scattered: set[str], root_files: list[str], root_touched: bool) -> list[str]:
    """Pathspec to scope the diff to exactly what's governed and changed."""
    paths = sorted(touched_scattered)
    if root_touched:
        paths.extend(sorted(root_files))
    return paths


def _diff_fingerprint(root: Path, paths: list[str]) -> str:
    """Hash the diff of just the touched paths — so unrelated edits don't churn
    the fingerprint and re-trigger reflections."""
    raw = _git(["diff", "HEAD", "--", *paths], root)
    return hashlib.sha256(raw.encode("utf-8", "replace")).hexdigest()


def _spawn_reflector(reflector: Path, root: Path) -> bool:
    """Fire-and-forget the reflector, fully detached from this hook process."""
    creationflags = 0
    start_new_session = False
    if os.name == "nt":
        creationflags = subprocess.CREATE_NEW_PROCESS_GROUP | _DETACHED_PROCESS
    else:
        start_new_session = True
    try:
        subprocess.Popen(
            [sys.executable, str(reflector)],
            cwd=str(root),
            stdin=subprocess.DEVNULL,
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
            creationflags=creationflags,
            start_new_session=start_new_session,
        )
    except (OSError, subprocess.SubprocessError) as exc:
        print(f"[self-improving hook] could not start reflector: {exc}", file=sys.stderr)
        return False
    return True


def main() -> int:
    _force_utf8()

    # Drain the hook payload on stdin; this hook does not need it.
    try:
        sys.stdin.read()
    except (OSError, ValueError):
        pass

    # Guard 1 — recursion. A reflection spawns a headless `claude` whose own
    # Stop hook runs this file again. If the lock is set, do nothing.
    if os.environ.get(_LOCK_ENV):
        return 0

    root = _project_root()
    touched_scattered, root_files, root_touched = _touched(root)
    if not touched_scattered and not root_touched:
        return 0

    paths = _diff_paths(touched_scattered, root_files, root_touched)

    # Guard 2 — dedup. The Stop hook fires every turn; only reflect when the
    # diff itself is new since the last reflection.
    fingerprint = _diff_fingerprint(root, paths)
    state = root / _STATE_FILE
    try:
        if state.read_text(encoding="utf-8").strip() == fingerprint:
            return 0
    except OSError:
        pass  # no prior state — first reflection for this diff

    reflector = Path(__file__).with_name(_REFLECTOR)
    if not reflector.is_file():
        print(f"[self-improving hook] {_REFLECTOR} missing — skipped", file=sys.stderr)
        return 0

    if not _spawn_reflector(reflector, root):
        return 0

    # Record the fingerprint so identical follow-up turns do not re-spawn.
    try:
        state.parent.mkdir(parents=True, exist_ok=True)
        state.write_text(fingerprint, encoding="utf-8")
    except OSError:
        pass

    governed = sorted(touched_scattered) + (["(repo root → central docs)"] if root_touched else [])
    print(
        f"[self-improving hook] {len(governed)} governed area(s) changed "
        f"({', '.join(governed)}) — reflecting in the background "
        f"→ {_REVIEW_FILE}",
        file=sys.stderr,
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())
