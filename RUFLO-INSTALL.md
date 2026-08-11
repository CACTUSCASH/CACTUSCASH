# Ruflo — installed skills, agents & plugins

This repository has [Ruflo](https://github.com/ruvnet/ruflo) vendored into it so that
Claude Code auto-discovers its skills, agents, and slash commands whenever you open
this repo, and so the full plugin marketplace can be installed locally.

Ruflo is an agent meta-harness for Claude Code (100+ agents, coordinated swarms,
self-learning memory, and enterprise guardrails). Source: https://github.com/ruvnet/ruflo
Licensed MIT — see [`RUFLO-LICENSE`](./RUFLO-LICENSE).

## What was installed

| Location | Contents |
|----------|----------|
| `.claude/skills/`   | 38 skills — auto-loaded by Claude Code in this repo |
| `.claude/agents/`   | 108 subagent definitions |
| `.claude/commands/` | 168 slash commands |
| `plugins/`          | 38 Ruflo plugins (the full marketplace) |
| `.claude-plugin/marketplace.json` | Marketplace manifest for `/plugin` |

The skills, agents, and commands are plain markdown and work immediately — no
runtime needed. Open this repo in Claude Code and they are available.

## Installing the plugins

The 38 plugins are vendored under `plugins/`. To register the marketplace and
install plugins, run inside Claude Code from the repo root:

```
/plugin marketplace add ./
/plugin install ruflo-core@ruflo
```

Install any other plugin the same way (names in `.claude-plugin/marketplace.json`),
or install everything by repeating `/plugin install <name>@ruflo` for each.

## Making it global (available in every project / Cowork / anywhere)

The install above is scoped to *this* repo. To make the skills, agents, and
commands available in **every** Claude Code project on a machine — including
**Claude Cowork desktop**, which reads the same `~/.claude` directory — run the
one-command installer once per machine, from the repo root:

```
git clone https://github.com/cactuscash/cactuscash
cd cactuscash
bash global-install/install.sh
```

That copies everything into user-level `~/.claude/skills`, `~/.claude/agents`,
and `~/.claude/commands` (auto-discovered in all projects) and merges the plugin
marketplace + `enabledPlugins` into `~/.claude/settings.json`. Restart Claude
Code / Cowork afterward.

Prefer to do it by hand? Copy `.claude/skills`, `.claude/agents`, and
`.claude/commands` into `~/.claude/`, and merge
[`global-install/settings.snippet.json`](./global-install/settings.snippet.json)
into `~/.claude/settings.json`.

### What "global" can and can't reach

| Environment | How it gets the content | Persistent? |
|-------------|------------------------|-------------|
| Local Claude Code (any project) | `bash global-install/install.sh` → `~/.claude/` | ✅ yes |
| Claude Cowork (desktop) | same `~/.claude/` on that machine | ✅ yes |
| Claude Code on the web / **dispatch** | commit `.claude/` into the repo you open (done for *this* repo) | ⚠️ per-repo only |

**Important:** web/dispatch sessions run in fresh, ephemeral containers — a
user-level `~/.claude` does **not** follow you there. The only way to get these
skills into a web session is to have `.claude/` committed in the repo that
session opens. This repo already has that; for another repo, copy `.claude/`
into it too (or add this marketplace to that repo's `.claude/settings.json`).

Account-level skills that appear in Cowork's skill picker are managed in the
Claude app's settings UI — that toggle isn't a file I can set from here.

## Enabling the runtime (optional — not vendored)

Ruflo's live capabilities — the MCP server, background workers, AgentDB vector
memory, federation, and hooks — require the Ruflo CLI, which is **not** committed
here (it is machine-level tooling, not repo content, and would error in sessions
without it). Enable it separately:

```
# Full CLI + guided setup
npx ruflo@latest init wizard

# Register the MCP server with Claude Code
claude mcp add ruflo -- npx ruflo@latest mcp start
```

Full docs: `.claude-plugin/docs/INSTALLATION.md` and https://github.com/ruvnet/ruflo

## Notes

- Only the standalone, portable content was vendored. Ruflo's own top-level
  `settings.json`, `mcp.json`, and statusline scripts were intentionally
  omitted so they don't fail in environments without the Ruflo CLI.
- Enabling all 35 plugins is safe without the Ruflo CLI. Only 2 of them
  (`ruflo-core`, `ruflo-cost-tracker`) ship hooks, and their shim
  (`scripts/ruflo-hook.cjs`) wraps every call in try/catch and **always exits
  0**, specifically so a missing CLI never blocks a turn or surfaces an error.
  Without the CLI those hooks are simply no-ops.
- The marketplace is fetched from GitHub by ref. `install.sh` derives the ref
  from the clone it runs out of, so it works from a feature branch and from the
  default branch after merge — no manual editing needed.
- To update, re-copy these directories from the upstream repo.
