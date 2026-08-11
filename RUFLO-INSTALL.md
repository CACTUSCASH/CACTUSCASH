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
| `.claude/skills/`   | 39 skills — auto-loaded by Claude Code in this repo |
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

- Only the standalone, portable content was vendored. Ruflo's own
  `settings.json`, `mcp.json`, statusline scripts, and hooks were intentionally
  omitted so they don't fail in environments without the Ruflo CLI.
- To update, re-copy these directories from the upstream repo.
