# Claude Code configuration

## Goal: all of ECC's skills available in every dispatched session, from anywhere

[ECC](https://github.com/affaan-m/ECC) (`affaan-m/ECC`) ships 284 skills, 67
agents, and 94 commands. There are two scopes, and they use different
mechanisms.

### 1. Everywhere / any repo (the real "from anywhere") — cloud environment setup script

For ECC to be available the moment you dispatch **any** cloud session, in
**any** repo, the install has to run in your **cloud environment's setup
script**. That setup script:

- runs before Claude Code launches (so the skills exist when Claude enumerates
  them), on every surface — web, `claude --cloud`, mobile app, routines,
  Claude Tag;
- is cached after the first run, so later sessions start fast;
- lives in your **Claude Code web settings**, not in this repo.

**This cannot be set from inside a session / from the repo — you configure it
in the web UI.** Steps:

1. Go to **claude.ai/code**.
2. Open your environment settings (**Cloud environments** → hover your
   environment → the settings gear; the **Default** environment works).
3. Paste the contents of [`scripts/ecc-cloud-setup.sh`](../scripts/ecc-cloud-setup.sh)
   into the **Setup script** field and save.

That script `git clone`s ECC and copies its `skills/`, `agents/`, `commands/`,
and `rules/` into `~/.claude/`. From then on every dispatched session has them
available immediately. (It deliberately skips ECC's `hooks/`, which
auto-execute; see the script's comments to include them.)

`scripts/ecc-cloud-setup.sh` is committed here only as a reference copy —
committing it does **not** activate it; the web-UI paste is what activates it.

### 2. This repo only — `.claude/settings.json`

`settings.json` registers the ECC marketplace and lists the `ecc` plugin in
`enabledPlugins`. This is the documented way to declare a plugin for sessions
that open this repo. Caveat: in **cloud** sessions the interactive `/plugin`
install flow isn't available, so this path is reliable mainly for **local /
terminal** use of this repo; for cloud, use the setup script in section 1.

### Heads up

ECC is third-party code reached via an external link. Review
https://github.com/affaan-m/ECC (its `skills/`, `hooks/`, `scripts/`, and
installer) so you know what you're enabling — especially before opting to
install its auto-executing hooks.
