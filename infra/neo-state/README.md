# NEO Sovereign Database & State Fabric

Gate 117 separates NEO's logical state contract from any one database provider.

## Migration path

1. FIRESTORE_PRIMARY
2. DUAL_WRITE
3. POSTGRES_PRIMARY
4. FIRESTORE_READ_ONLY
5. CUTOVER_COMPLETE

The transition to PostgreSQL primary requires verified dual-write consistency, verified backup/PITR, healthy replicas, tested rollback, and explicit cutover authority.

## PostgreSQL target

The repository includes a PostgreSQL-compatible schema and adapter contract. It does not claim that a production PostgreSQL cluster is already running.

Production requirements include:

- TLS/mTLS via Gates 114–115;
- credentials from Gate 116;
- encrypted backups exported through Gate 113;
- WAL or equivalent continuous journal shipping;
- point-in-time recovery drills;
- replica health monitoring;
- schema migration checksums;
- cutover/rollback runbook;
- no automatic primary switch.

Firestore remains a supported backend during migration and may stay in read-only/fallback mode until the cutover is proven.
