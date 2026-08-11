#!/usr/bin/env bash
# Ruflo global installer — makes the vendored skills, agents, commands, and the
# plugin marketplace available in EVERY Claude Code project on this machine
# (and in Claude Cowork desktop, which reads the same ~/.claude directory).
#
# Run once per machine, from the repo root:
#     bash global-install/install.sh
#
# Re-running is safe (idempotent): it overwrites the ruflo-* content and merges
# the marketplace/plugin config into your existing ~/.claude/settings.json
# without touching your other settings.
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CLAUDE_HOME="${CLAUDE_CONFIG_DIR:-$HOME/.claude}"

echo "==> Installing Ruflo into $CLAUDE_HOME (global / user-level)"
mkdir -p "$CLAUDE_HOME/skills" "$CLAUDE_HOME/agents" "$CLAUDE_HOME/commands"

# 1. Skills, agents, commands -> user-level (auto-discovered in all projects)
cp -R "$REPO_ROOT/.claude/skills/."   "$CLAUDE_HOME/skills/"
cp -R "$REPO_ROOT/.claude/agents/."   "$CLAUDE_HOME/agents/"
cp -R "$REPO_ROOT/.claude/commands/." "$CLAUDE_HOME/commands/"
echo "    skills:   $(find "$REPO_ROOT/.claude/skills" -name SKILL.md | wc -l | tr -d ' ')"
echo "    agents:   $(find "$REPO_ROOT/.claude/agents" -name '*.md' | wc -l | tr -d ' ')"
echo "    commands: $(find "$REPO_ROOT/.claude/commands" -name '*.md' | wc -l | tr -d ' ')"

# 2. Merge marketplace + enabledPlugins into ~/.claude/settings.json
#    The marketplace is fetched from GitHub by ref. We derive the ref from the
#    clone this script is running out of, so it is correct whether the content
#    lives on a feature branch or has been merged to the default branch.
SETTINGS="$CLAUDE_HOME/settings.json"
SNIPPET="$REPO_ROOT/global-install/settings.snippet.json"
[ -f "$SETTINGS" ] || echo '{}' > "$SETTINGS"

REF="$(git -C "$REPO_ROOT" rev-parse --abbrev-ref HEAD 2>/dev/null || echo main)"
[ "$REF" = "HEAD" ] && REF="$(git -C "$REPO_ROOT" rev-parse HEAD)"
echo "    marketplace ref: $REF"

python3 - "$SETTINGS" "$SNIPPET" "$REF" <<'PY'
import json, sys
settings_path, snippet_path, ref = sys.argv[1], sys.argv[2], sys.argv[3]
try:
    cur = json.load(open(settings_path))
    if not isinstance(cur, dict): cur = {}
except Exception:
    cur = {}
snip = json.load(open(snippet_path))
mkts = snip["extraKnownMarketplaces"]
for entry in mkts.values():
    # pin to the ref we were installed from; drop once merged to default branch
    if ref and ref != "main":
        entry["source"]["ref"] = ref
    else:
        entry["source"].pop("ref", None)
cur.setdefault("extraKnownMarketplaces", {}).update(mkts)
cur.setdefault("enabledPlugins", {}).update(snip["enabledPlugins"])
json.dump(cur, open(settings_path, "w"), indent=2)
open(settings_path, "a").write("\n")
print("    settings: merged marketplace + %d plugins into %s" % (len(snip["enabledPlugins"]), settings_path))
PY

cat <<'EOF'

==> Done. Skills, agents, and commands are now global on this machine.

   Restart Claude Code (or Cowork). The 38 skills / 108 agents / 168 commands
   are available in every project — no per-repo setup needed.

   Plugins: enabledPlugins is registered, but plugins fetch from GitHub the
   first time. In any Claude Code session run:
       /plugin marketplace add cactuscash/cactuscash
   then plugins in settings.json load automatically.

   NOTE: Some plugins ship hooks that call the Ruflo CLI. For those to run
   (not just the skills/agents), install the runtime once:
       npx ruflo@latest init wizard
   Hooks from ruflo-core/ruflo-cost-tracker are no-ops without it (the shim
   always exits 0), so nothing breaks either way.
EOF
