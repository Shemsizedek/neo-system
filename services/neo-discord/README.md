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
- runtime selection and failover policy

Canonical core:
- `core/authorization.js`
- `core/interaction.js`
- `core/relations.js`
- `core/neo-command.js`
- `core/asset-display.js`
- `core/counterparty.js`
- `core/treasury.js`

Runtime adapters:
- `adapters/cloudflare/` — current production HTTPS transport. Owns Discord signature verification, HTTP handling, and the optional Workers AI binding only.
- `adapters/node-http/` — portable Node HTTP runtime. Adapter parity with Cloudflare is CI-tested, but it is not a live production deployment yet.

Runtime policy:
- `deployment/runtime-policy.json` is the canonical adapter-selection policy.
- `deployment/evaluate-policy.mjs` validates the policy and evaluates promotion prerequisites.
- Current primary: `cloudflare-worker`.
- Current standby: `node-http`, marked not deployed.
- Automatic promotion is disabled.
- A standby promotion must be explicitly dispatched after parity CI, deployment, and health checks succeed.
- Transport failover may not change authorization policy, approve intents, or enable sensitive execution.

Command manifests live under `commands/` and are provider-independent.

Architecture:

`GitHub Pages frontend -> GitHub source/orchestration -> Discord operator/API surface -> selected thin HTTPS adapter -> services/neo-discord core`

GitHub remains the source of truth and backend orchestration layer. Discord remains the primary operator/API surface. Cloudflare is only the currently selected transport adapter and can be replaced without moving command/business logic.

Secrets remain runtime-only. Direct sensitive execution, AI approval, and Discord approval remain disabled unless a later approved gate changes those policies.
