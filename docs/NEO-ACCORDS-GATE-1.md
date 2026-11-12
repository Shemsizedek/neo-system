# NEO Accords - Gate 1 / Project 144

Status: SOURCE PILOT - no active runtime, legal effect, issuance or public endpoint.
Owner: NEOsync / Project 144.

## Mission
Provide a portable verifiable coordination record among multiple NEO nodes, organizations, human operators and software agents. An Accord is a digest of proposed terms plus identity-bound consent receipts; it is not automatically a contract, settlement, wallet delegation or permission to execute a mission.

## Gate 1 protocol
- Proposal requires at least two distinct parties, purpose, SHA-256 terms digest, trust domain and expiration.
- Each party independently signs a domain-separated decision payload using an Ed25519 identity key, verified against trusted registry entries using the existing NEO Router identity-trust module.
- Duplicate votes, malformed proposals, changes to the terms digest, unknown parties, expired proposals, revoked keys or invalid signatures fail closed.
- All-party acceptance means accepted-for-review only. No automatic mission execution, contract effect, wallet action or Bitcoin/Counterparty broadcast.
- The governance-record adapter is compatible with the existing NEO Router hash-linked governance ledger; durable storage, replication, replay protection across restarts and chain anchoring are not implemented.
- Keep private keys, medical records, financial details, legal filings and personally identifiable data off any public blockchain.

## Reuse
- server/neo-router/identity-trust.mjs - identity registry and signature verification
- server/neo-router/institutional-governance.mjs - decision records, authority, quorum and hash-linked ledger
- orchestration/neo-router.yaml - provider-neutral orchestration
- governance/automation/neo-automation-control-plane.md - approval classes and execution boundaries

## Test
Run: node --test server/neo-accords/accords.test.mjs
Isolated local smoke testing passed four tests. CI and staging verification remain outstanding.

## Next gate
1. Build a persistent trusted identity and signing-key registry in NEOpass/NeoMask with immediate revocation.
2. Build append-only evidence persistence and multi-node replication checkpoints, with cross-node durable replay protection.
3. Test HTTPS staging endpoints, node outage and failover, clock drift, revocation, quorums and conflicts.
4. Complete legal, privacy and retention review before enabling agreements that bind external counterparties.
5. Only consider Bitcoin/Counterparty public digest anchoring after wallet authority, cost, privacy and confirmation controls are verified.

Release blockers: deployment, durable identity registry, authenticated federation, backups, monitoring, independent nodes, legal classification and production security review.
