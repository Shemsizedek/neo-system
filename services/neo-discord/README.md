# NEO Discord transport

`services/neo-discord` is the canonical provider-neutral Discord transport and command layer for the NEO System.

Primary responsibilities:
- Discord command and business handlers
- actor and guild authorization helpers
- prompt routing and grounded status responses
- GitHub-backed control-plane access
- Counterparty and treasury read-only integrations
- asset display policy
- provider-neutral transport contracts
- Discord command manifests

Canonical core:
- `core/authorization.js`
- `core/relations.js`
- `core/neo-command.js`
- `core/asset-display.js`
- `core/counterparty.js`
- `core/treasury.js`

Runtime adapters:
- `adapters/cloudflare/` — current production HTTPS transport. Owns Discord signature verification, HTTP handling, and the optional Workers AI binding only.
- `adapters/node-http/` — portable Node HTTP runtime contract for a future alternate host. It is not a live production deployment yet.

Command manifests live under `commands/` and are provider-independent.

Architecture:

`GitHub Pages frontend -> GitHub source/orchestration -> Discord operator/API surface -> thin HTTPS adapter -> services/neo-discord core`

GitHub remains the source of truth and backend orchestration layer. Discord remains the primary operator/API surface. Cloudflare is only the currently deployed transport adapter and can be replaced without moving command/business logic.

Secrets remain runtime-only. Direct sensitive execution, AI approval, and Discord approval remain disabled unless a later approved gate changes those policies.
