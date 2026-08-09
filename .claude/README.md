# Claude Code configuration

All of [ECC](https://github.com/affaan-m/ECC)'s (`affaan-m/ECC`, MIT) agents,
commands, and skills are vendored into this repo so they load automatically in
any Claude Code session that opens it — including cloud sessions you dispatch —
with no install step, plugin, or settings toggle required.

## What's here

| Path              | Count | Loads as                                             |
| ----------------- | ----- | ---------------------------------------------------- |
| `.claude/skills/` | 284   | Model-invoked skills (auto-suggested by task)        |
| `.claude/agents/` | 67    | Subagents (available to the Task tool / `@`-dispatch)|
| `.claude/commands/`| 94   | Slash commands                                       |

Claude Code loads skills, agents, and commands committed under a repo's
`.claude/` directory automatically, in both local and cloud sessions. That is
why these are vendored directly rather than installed as a plugin: cloud
sessions don't have the interactive `/plugin` installer, so vendoring is the
reliable way to get everything "at your disposal when you dispatch."

## Provenance & license

- Source: https://github.com/affaan-m/ECC
- Vendored commit: see `.claude/.ecc-source-commit`
- License: MIT — `ECC-LICENSE` (Copyright (c) 2026 Affaan Mustafa)

To update to a newer ECC, re-copy `skills/`, `agents/`, and `commands/` from a
fresh clone and update `.ecc-source-commit`.

## Deliberately excluded: hooks

ECC's `hooks/` are **not** vendored. Hooks auto-execute third-party code on
every session/tool event; skills, agents, and commands are only invoked on
demand. If you want ECC's hooks too, copy its `hooks/` and wire them per ECC's
docs — but review https://github.com/affaan-m/ECC/tree/main/hooks first.

## Every repo, not just this one

The above makes ECC available whenever you dispatch a session **on this repo**.
To have it in **every** repo/session, install it once via your cloud
environment's setup script — paste `scripts/ecc-cloud-setup.sh` into the Setup
script field at claude.ai/code (see that file's header for steps).

## `settings.json`

Registers the ECC marketplace under `extraKnownMarketplaces` for optional
local `/plugin` use. Not required for the vendored skills/agents/commands above.
