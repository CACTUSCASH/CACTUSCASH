#!/bin/bash
# ---------------------------------------------------------------------------
# ECC "all skills, everywhere" cloud setup script
#
# PASTE THE CONTENTS OF THIS FILE INTO:
#   claude.ai/code  ->  (your) Cloud environment  ->  Setup script field
#
# It runs once per environment (before Claude Code launches) and is then
# cached, so every future cloud session you dispatch -- from the web, the
# mobile app, `claude --cloud`, routines, or Claude Tag, in ANY repo -- starts
# with all of affaan-m/ECC's skills, agents, and commands already installed in
# ~/.claude, available immediately.
#
# This file is committed to the repo only as a reference / backup. A setup
# script is configured in the web UI, NOT loaded from a repo, so committing it
# here does not activate it -- you must paste it into the environment dialog.
# ---------------------------------------------------------------------------
set -u

ECC_REPO="https://github.com/affaan-m/ECC"
ECC_SRC="/opt/ecc"                       # cached clone location
DEST="${CLAUDE_CONFIG_DIR:-$HOME/.claude}"

# Fetch or update ECC. github.com is on the default Trusted network allowlist.
if [ -d "$ECC_SRC/.git" ]; then
  git -C "$ECC_SRC" pull --ff-only || true
else
  git clone --depth 1 "$ECC_REPO" "$ECC_SRC" || true
fi

# Install the model-invoked capabilities into the user config dir.
# NOTE: 'hooks' is intentionally NOT copied. Hooks auto-execute third-party
# code on every tool/session event; skills/agents/commands are only invoked
# on demand. To also install hooks, add 'hooks' to the list below -- but
# review https://github.com/affaan-m/ECC/tree/main/hooks first.
for d in skills agents commands rules; do
  if [ -d "$ECC_SRC/$d" ]; then
    mkdir -p "$DEST/$d"
    cp -a "$ECC_SRC/$d/." "$DEST/$d/" || true
  fi
done

echo "ECC installed into $DEST (skills/agents/commands/rules)."
exit 0
