# CROWN-GEM-064 — Existing NEO Nous OS / Crown Chain lineage

## Authority and provenance
NEO Nous OS is the originating system; NEO Crown Chain is its Bitcoin/Counterparty-anchored chain architecture. This reconciliation is additive and must NOT create a competing chain, alternate genesis, or new authoritative chain history.

## Inspected repository evidence
- `src/noology/nousEconomicValueKernel.ts`: existing typed economic ledger and `postNousValueEvent` which validates provenance, protects against duplicate event IDs, and appends events immutably to returned ledger state.
- `docs/NOUS_ECONOMIC_VALUE_KERNEL.md`: existing provenance-first sequence, accounting classes, and explicit external-settlement boundary.
- `src/neoSystem.ts`: module registry and documentary provenance boundaries.
- Existing Crown development branches discovered: `crown027-etha-workload`, `crown028-etha-auth-proof-v2`, `crown034-service-mesh-proof`, `crown035-capability-enforcement`, `crown036-tier1-route-enforcement`, `crown037-tier2-route-enforcement`, `crown-020-neopass-trust-bridge`.

## Mandatory integration gates
1. Locate and preserve original Crown Chain genesis, block schema, chain ID, state transition rules, consensus validation, issuance data, and Bitcoin/Counterparty anchor references in repository history/branches; preserve hashes and original paths.
2. Derive a compatibility map from original canonical schemas to `deploy/crown-gem-004/{audit_chain,evidence_registry,nous_checkpoint,anchor_adapter}.py`. Do NOT rewrite existing history, rename original fields destructively, or introduce a genesis block.
3. Gate new records behind canonical Crown Chain block validation and Nous OS capability policy; the current Python registry is staging proof-of-concept only.
4. Persist independently witnessed, append-only checkpoints, verify an actual Bitcoin transaction commitment and confirmations using independent Bitcoin data sources, and demonstrate adversarial rewrite detection.
5. Inconsistencies are rejected and documented as append-only exceptions; corrections append successor entries, never mutate accepted blocks.

## Current status
The original Crown genesis/data source is not yet positively identified from the inspected repository files. No original Crown Chain blocks were migrated or modified. No Bitcoin anchor was published or independently verified. Production remains NO-GO.
