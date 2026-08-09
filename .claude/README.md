# Claude Code configuration

## Registered plugin marketplaces

`settings.json` registers the [ECC](https://github.com/affaan-m/ECC) marketplace
(`affaan-m/ECC`) under `extraKnownMarketplaces`. This only makes the marketplace
**known** to Claude Code — it does **not** install or enable any plugin, and no
ECC hooks or scripts run as a result.

To actually install the ECC plugin (284 skills, 67 agents, hooks, etc.), do it
explicitly after reviewing the source:

```
/plugin install ecc@ecc
```

Enabling the plugin loads ECC's hooks, which auto-execute on session/tool
events. Review https://github.com/affaan-m/ECC (installer, `hooks/`, `scripts/`)
before enabling.
