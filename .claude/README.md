# Claude Code configuration

## ECC plugin (skills, agents, hooks)

`settings.json` does two things:

1. **Registers** the [ECC](https://github.com/affaan-m/ECC) marketplace
   (`affaan-m/ECC`) under `extraKnownMarketplaces`.
2. **Enables** the `ecc` plugin via `enabledPlugins`, so all of ECC's skills,
   agents, and hooks are turned on for every Claude Code session that opens
   this repository.

### One-time install prompt

ECC is an external (GitHub-sourced) plugin. The first time you open this repo,
Claude Code will ask you to **trust the folder and install** the ECC
marketplace/plugin. This is a one-time step per machine:

```
/plugin install ecc@ecc
```

After that install, `enabledPlugins` keeps ECC on automatically — its skills
become model-invocable (namespaced `ecc:<skill-name>`) and are auto-suggested
by task context, the same as built-in skills.

### Scope

This config is **project-scoped** (checked into the repo), so it applies to any
Claude session working in this repository. To have ECC's skills available in
**every** repo/session on your machine, add the same `extraKnownMarketplaces`
and `enabledPlugins` entries to your personal `~/.claude/settings.json`, or run
`/plugin marketplace add affaan-m/ECC` then `/plugin install ecc@ecc` once
globally.

### Heads up

Enabling ECC loads its **hooks**, which auto-execute on session/tool events.
This is third-party code — review https://github.com/affaan-m/ECC (its
`hooks/`, `scripts/`, and installer) so you know what runs.
