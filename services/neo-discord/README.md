# NEO Discord transport

`services/neo-discord` is the canonical provider-neutral Discord transport layer for the NEO System.

Primary responsibilities:
- Discord command/business handlers
- actor and guild authorization helpers
- provider-neutral transport contracts
- GitHub-backed control-plane access

Provider-specific runtimes belong under adapters. The existing Cloudflare Worker is retained only as a deploy adapter and imports canonical logic from this package.

Architecture:

`Discord -> thin HTTPS adapter -> services/neo-discord -> GitHub-backed NEO control plane`

GitHub remains the source of truth. Discord remains the primary operator/API surface. Provider adapters must not become the canonical home for NEO business logic.

Secrets remain runtime-only. Direct sensitive execution, AI approval, and Discord approval remain disabled unless a later approved gate changes those policies.