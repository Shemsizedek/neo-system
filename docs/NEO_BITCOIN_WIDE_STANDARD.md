# Project 144 — NEO-wide Bitcoin Core, NVM and BVM adoption

Status: **proposed code and governance gate**; not activated on production.
Canonical registry: `architecture/neo-bitcoin-execution-standard.json`.
Resolver: `server/neo-vm/project-policy.mjs`.

The policy covers all 22 apps from `neo-services-normalization.json`, all 13 system entries from `neo-existing-system-inventory.json`, and 31 named workstreams/aliases. A project can be registered even when it does not need Bitcoin.

- Bitcoin Core independently validates Bitcoin transactions and consensus. Reuse a trusted NEO-operated installation, never expose RPC credentials to UI.
- Counterparty remains a separate Bitcoin-based protocol with its own API/indexing; observing Counterparty is not the same as directly connecting to Bitcoin Core RPC.
- NVM compiles only its approved Bitcoin Script subset, and BVM v0 accepts only a separately isolated Bitcoin Core regtest node.
- Existing checkout, bank, wallet, signing and settlement routes remain unchanged. The policy grants **read-only routing intent**, not an implemented or deployed NEO Core gateway. No issuance, signing or broadcasting is enabled.
- Projects outside the inventory fail closed. Review and register them before connecting them to Bitcoin.
- Ethereum/EVM execution and bridges are outside the approved NVM/BVM path, but existing unrelated systems are not silently removed.

## Next gates
1. Verify actual operator-owned Bitcoin Core binary and host used with Counterparty infrastructure; no claim of verified shared node until RPC evidence is collected.
2. Create isolated regtest instance and verify actual Bitcoin Core testmempoolaccept with valid and invalid witnesses.
3. Build and authenticate the shared backend observation gateway; add scope-specific authorization, audit logs, metrics and retry boundaries.
4. Migrate one project at a time behind feature flags and test rollback.
5. Require independent review and necessary compliance validation before payments or custody actions.
