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

Canonical modules now include:
- `core/authorization.js`
- `core/relations.js`
- `core/neo-command.js`
- `core/asset-display.js`
- `core/counterparty.js`
- `core/treasury.js`

Provider-specific runtimes belong under adapters. The existing Cloudflare Worker is retained only as a deploy/runtime adapter: it verifies Discord signatures, supplies its optional Workers AI binding, and delegates NEO command semantics to this package.

Architecture:

`Discord -> thin HTTPS runtime adapter -> services/neo-discord -> GitHub-backed NEO control plane + approved read-only data sources`

GitHub remains the source of truth. Discord remains the primary operator/API surface. Provider adapters must not become the canonical home for NEO business logic.

Secrets remain runtime-only. Direct sensitive execution, AI approval, and Discord approval remain disabled unless a later approved gate changes those policies.