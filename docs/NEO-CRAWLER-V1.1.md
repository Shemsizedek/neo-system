# NEO Crawler v1.1 — Persistent Intelligence Pipeline

This additive gate extends NEO Crawler v1 without changing the NEO Algo workspace or replacing existing Noogle acquisition logic.

## Added contracts
- Queue lifecycle: QUEUED -> RUNNING -> COMPLETED, with bounded retry/failure.
- Snapshot fingerprinting: canonical URL + content hash + retrieval time.
- Evidence Vault sink: crawler snapshots enter as UNREVIEWED research inputs.
- Router event contract: one provenance-preserving event can be routed to NEO Algo, NEO Oracle, NEOsync, Noogle/Neopedia, GISS review, NEO Law research, and NEO Evidence Vault.

## Governance
Crawler ingestion is not publication or adjudication. Evidence remains UNREVIEWED until an authorized review workflow changes its status. GISS and NEO Law targets are review/research targets, not automatic curriculum, doctrine, or legal authority.

## Persistence boundary
The Evidence Vault is the durable audit/evidence layer already present in NEO System. The queue in this gate is a service contract and in-process reference implementation; production distributed queue binding remains a later deployment gate.
