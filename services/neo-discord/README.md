# NEO Discord server/API plane

`services/neo-discord` is the canonical Discord server/API/control-plane layer for NEO Services.

NEO Services standard:
- GitHub = backend plane: source of truth, configuration, contracts, Actions orchestration, release gates, auditable state.
- GitHub Pages = frontend plane: static public/operator UI with no privileged secrets.
- Discord = server/API plane: commands, interaction responses, event routing, operator control, and service API surfaces.

Discord interactions require a public HTTPS endpoint. Any runtime used for that endpoint is a thin transport bridge only. It is not a NEO backend and may not own NEO business logic.

Canonical core:
- `core/authorization.js`
- `core/interaction.js`
- `core/relations.js`
- `core/neo-command.js`
- `core/asset-display.js`
- `core/counterparty.js`
- `core/treasury.js`

Transport bridges:
- `adapters/cloudflare/` — currently deployed HTTPS bridge. It owns Discord signature verification, HTTP transport glue, and optional provider binding only.
- `adapters/node-http/` — portable transport reference used to prove provider independence. It is not a separate NEO backend or server plane.

Canonical architecture contract:
- `architecture/neo-services-platform.json`
- `deployment/runtime-policy.json`

Architecture flow:

`GitHub backend -> GitHub Pages frontend + Discord server/API plane -> thin HTTPS transport bridge -> services/neo-discord core`

Secrets remain runtime-only. Transport changes may not alter RBAC, approve intents, enable sensitive execution, or move business logic out of GitHub/Discord-owned NEO service layers.
