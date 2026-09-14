# NEOsync Context Recall

Private executive retrieval service over the NEOsync Operational Memory Graph.

## Capabilities
- Natural-language recall over stored operational entities.
- Graph expansion to related entities and relationships.
- Recency-aware ranking.
- Provenance-preserving retrieval.
- Continuity prompts such as `Where did we leave off with Treasury?`, `Show everything connected to Shelton Estate & Co.`, and `Continue the last Tribunal matter.`

## Security
Cloudflare Access is required. `ADMIN_EMAILS` can further restrict access. The service binds directly to the `neo-memory-graph` Durable Object and does not expose the underlying private graph publicly.

This service is retrieval-only. It does not sign wallets, move funds, execute terminal commands, bypass permissions, perform enforcement, or create automatic legal effect.

## Required configuration
- `ACCESS_TEAM_DOMAIN`
- `ACCESS_AUD`
- Optional `ADMIN_EMAILS`
- External Durable Object binding `MEMORY_GRAPH` to `neo-memory-graph` / `MemoryGraphStore`

Register the deployed URL as `NEOSYNC_CONTEXT_RECALL_URL` on the NEO Government Worker.
