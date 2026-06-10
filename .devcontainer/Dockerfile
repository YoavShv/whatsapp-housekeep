FROM node:20

ARG TZ
ENV TZ="$TZ"

ARG CLAUDE_CODE_VERSION=latest

# Install basic development tools and iptables/ipset
RUN apt-get update && apt-get install -y --no-install-recommends \
  less \
  git \
  procps \
  sudo \
  fzf \
  zsh \
  man-db \
  unzip \
  gnupg2 \
  gh \
  iptables \
  ipset \
  iproute2 \
  dnsutils \
  aggregate \
  jq \
  nano \
  vim \
  && apt-get clean && rm -rf /var/lib/apt/lists/*

# Ensure default node user has access to /usr/local/share
RUN mkdir -p /usr/local/share/npm-global && \
  chown -R node:node /usr/local/share

ARG USERNAME=node

# Persist bash history.
RUN SNIPPET="export PROMPT_COMMAND='history -a' && export HISTFILE=/commandhistory/.bash_history" \
  && mkdir /commandhistory \
  && touch /commandhistory/.bash_history \
  && chown -R $USERNAME /commandhistory

# Set `DEVCONTAINER` environment variable to help with orientation
ENV DEVCONTAINER=true

# Create workspace and config directories and set permissions.
# /home/node/.codex must exist in the image before the codex-config-<devcontainerId>
# named volume gets mounted there at runtime — otherwise Docker creates the
# mountpoint as root:root and the codex CLI emits
#   "WARNING: proceeding, even though we could not update PATH: Permission denied"
# when it tries to write its state on startup.
RUN mkdir -p /workspace /home/node/.claude /home/node/.codex && \
  chown -R node:node /workspace /home/node/.claude /home/node/.codex

WORKDIR /workspace

ARG GIT_DELTA_VERSION=0.18.2
RUN ARCH=$(dpkg --print-architecture) && \
  wget "https://github.com/dandavison/delta/releases/download/${GIT_DELTA_VERSION}/git-delta_${GIT_DELTA_VERSION}_${ARCH}.deb" && \
  sudo dpkg -i "git-delta_${GIT_DELTA_VERSION}_${ARCH}.deb" && \
  rm "git-delta_${GIT_DELTA_VERSION}_${ARCH}.deb"

# Set up non-root user
USER node

# Install global packages
ENV NPM_CONFIG_PREFIX=/usr/local/share/npm-global
ENV PATH=$PATH:/usr/local/share/npm-global/bin

# Set the default shell to zsh rather than sh
ENV SHELL=/bin/zsh

# Set the default editor and visual
ENV EDITOR=nano
ENV VISUAL=nano

# Default powerline10k theme
ARG ZSH_IN_DOCKER_VERSION=1.2.0
RUN sh -c "$(wget -O- https://github.com/deluan/zsh-in-docker/releases/download/v${ZSH_IN_DOCKER_VERSION}/zsh-in-docker.sh)" -- \
  -p git \
  -p fzf \
  -a "source /usr/share/doc/fzf/examples/key-bindings.zsh" \
  -a "source /usr/share/doc/fzf/examples/completion.zsh" \
  -a "export PROMPT_COMMAND='history -a' && export HISTFILE=/commandhistory/.bash_history" \
  -x

# Auto-load GH_TOKEN from workspace .env.local on shell start (for gh CLI).
# Persists across container rebuilds since .env.local is on the bind-mounted workspace.
RUN echo '[ -f /workspace/.env.local ] && export $(grep "^GH_TOKEN=" /workspace/.env.local)' >> /home/node/.zshrc

# Install Claude
RUN npm install -g @anthropic-ai/claude-code@${CLAUDE_CODE_VERSION}

# ---- openai-codex plugin (baked into image; self-contained, no host coupling) ----
#
# Installs the codex CLI binary AND clones the openai-codex Claude Code
# marketplace into /home/node/.claude/plugins, plus writes the registry files
# (known_marketplaces.json, installed_plugins.json) that Claude Code reads on
# startup to discover plugins. After this layer, launching `claude` inside the
# container exposes the codex slash-commands and skills (/codex:setup, /codex:rescue, ...).
#
# Codex CLI authentication is handled at runtime, not here: run `codex login`
# once inside the container; the auth is persisted in the separate
# codex-config-<devcontainerId> named volume (see devcontainer.json mounts).
#
# >>> UPDATING the pinned versions below <<<
# /home/node/.claude is a Docker named volume (claude-code-config-<devcontainerId>).
# Docker seeds a named volume from the image content ONLY on the volume's
# first creation; subsequent rebuilds of the image do NOT push new files into
# an existing volume — the old files keep shadowing the new ones. So when you
# bump CODEX_CLI_VERSION or CODEX_PLUGIN_REF:
#   1. Rebuild the devcontainer image
#      (VS Code: Command Palette → "Dev Containers: Rebuild Container").
#   2. Stop the container, then remove the stale config volume so the next
#      start re-seeds it from the new image:
#         docker volume ls | grep claude-code-config
#         docker volume rm claude-code-config-<paste-the-id-here>
#   3. Reopen the container. Codex auth survives because it lives in a
#      different volume (codex-config-<devcontainerId>) — no `codex login` needed.
#
# To pin to a specific git ref (tag/branch), override CODEX_PLUGIN_REF at build
# time, e.g. `--build-arg CODEX_PLUGIN_REF=v1.0.4`. SHAs are not supported by
# this `--branch` form; if you need SHA pinning, switch to a full clone + checkout.
ARG CODEX_CLI_VERSION=0.133.0
ARG CODEX_PLUGIN_REF=main
ARG CODEX_PLUGIN_VERSION=1.0.4
RUN npm install -g @openai/codex@${CODEX_CLI_VERSION} \
 && mkdir -p /home/node/.claude/plugins/marketplaces \
             /home/node/.claude/plugins/cache/openai-codex/codex \
 && git clone --depth=1 --branch=${CODEX_PLUGIN_REF} \
        https://github.com/openai/codex-plugin-cc.git \
        /home/node/.claude/plugins/marketplaces/openai-codex \
 && cp -r /home/node/.claude/plugins/marketplaces/openai-codex/plugins/codex \
          /home/node/.claude/plugins/cache/openai-codex/codex/${CODEX_PLUGIN_VERSION} \
 && NOW=$(date -u +%Y-%m-%dT%H:%M:%SZ) \
 && SHA=$(git -C /home/node/.claude/plugins/marketplaces/openai-codex rev-parse HEAD) \
 && jq -n --arg now "$NOW" '{"openai-codex":{source:{source:"github",repo:"openai/codex-plugin-cc"},installLocation:"/home/node/.claude/plugins/marketplaces/openai-codex",lastUpdated:$now}}' > /home/node/.claude/plugins/known_marketplaces.json \
 && jq -n --arg now "$NOW" --arg sha "$SHA" --arg ver "${CODEX_PLUGIN_VERSION}" '{version:2,plugins:{"codex@openai-codex":[{scope:"user",installPath:("/home/node/.claude/plugins/cache/openai-codex/codex/"+$ver),version:$ver,installedAt:$now,lastUpdated:$now,gitCommitSha:$sha}]}}' > /home/node/.claude/plugins/installed_plugins.json

# Pre-install Playwright Chromium (system deps as root, browser binary as node).
# Runs during image build where there's no firewall, so the download is reliable.
USER root
RUN npx --yes playwright@1.59.1 install-deps chromium
USER node
RUN npx --yes playwright@1.59.1 install chromium

# Copy and set up firewall script
COPY init-firewall.sh /usr/local/bin/
USER root
RUN chmod +x /usr/local/bin/init-firewall.sh && \
  echo "node ALL=(root) NOPASSWD: /usr/local/bin/init-firewall.sh" > /etc/sudoers.d/node-firewall && \
  chmod 0440 /etc/sudoers.d/node-firewall
USER node
