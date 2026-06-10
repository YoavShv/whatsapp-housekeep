#!/usr/bin/env bash
set -euo pipefail

REMOTE_USER="${_REMOTE_USER:-node}"

# Self-contained: node:20 ships curl, but don't assume it (portability).
if ! command -v curl >/dev/null 2>&1; then
  apt-get update
  apt-get install -y --no-install-recommends curl ca-certificates
  rm -rf /var/lib/apt/lists/*
fi

# Runs as ROOT at image BUILD time — no firewall yet (init-firewall.sh runs at
# postStartCommand, i.e. container start), so PyPI and astral.sh are reachable.
# Install AS the remote user so uv + serena land in their ~/.local (an image
# layer, NOT a named volume) and are owned by them. PATH is handled in
# devcontainer-feature.json (containerEnv), so tell the uv installer not to
# touch shell profiles.
su - "$REMOTE_USER" -c "set -euo pipefail
  export UV_NO_MODIFY_PATH=1
  curl -LsSf https://astral.sh/uv/install.sh | sh
  \"\$HOME/.local/bin/uv\" tool install -p 3.13 'serena-agent==${VERSION}'
"
