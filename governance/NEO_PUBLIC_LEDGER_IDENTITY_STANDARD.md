# NEO Public Ledger Identity Standard

The canonical founder principal `neo:founder:000001` is reserved as Account #1 for NEO Explorer, NEOscan, NEO Ledger, and NEO Statements.

Founder ownership does not override source truth. Bitcoin transaction/block data, Counterparty asset data, CES observations, market records, accounting entries, and offline/off-book records must retain their source and provenance. Founder status cannot rewrite blockchain verification results, mutate indexed facts, erase audit history, certify accounting, or publish statements without separate authorization.

## Product boundaries

- **NEO Explorer**: verification is evidence-driven. Founder status cannot alter Bitcoin/blockchain results or source provenance.
- **NEOscan**: indexing and asset presentation remain source-backed. Account #1 cannot silently rewrite indexed asset or transaction data.
- **NEO Ledger**: ledger mutation and accounting overrides require explicit authorization, authentication, step-up verification, and audit history.
- **NEO Statements**: publication and accounting certification are separate privileged actions. A statement must distinguish observed/source data from organization-supplied, offline, or off-book accounting data.

## Provenance

Every public accounting or verification record should identify its source class, source identifier, observation time, and immutable reference where one exists. Public interfaces must not represent internally supplied data as blockchain-verified unless it was actually verified against the relevant source.

## Security

No wallet private keys, signing secrets, passwords, CES credentials, recovery material, or custody secrets belong in the public identity or provenance registry.
