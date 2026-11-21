# NEO-EFAX-015: independent staging gate

This branch is metadata-only and stacks on draft PR #1442. No fax transmission, documents, payment, or production deployment.

Provider direction: Northflank Sandbox is a proposed independent staging environment; Phaxio is only an offline adapter simulator. Neither provider has been connected, provisioned or deployed. Alternatives for later evaluation include Railway and Fly.io.

## Implementation
- Workflow requires trusted server-side actor identity, tenant ID and role. Do not accept client-supplied role or tenant ID.
- PostgreSQL adapter accepts an injected pg-compatible Pool and surrounds status writes plus audit writes with BEGIN/COMMIT/ROLLBACK. Tenant-scoped reads lock rows and updates compare versions.
- SQL migration is proposed for an isolated database, NOT applied. Use least-privilege role with no UPDATE/DELETE/TRUNCATE on audit.
- Phaxio adapter makes ZERO provider calls, requires explicit local simulation, and always rejects sendFax.
- Root npm test includes eFax tests via package.json; no workflow file changes.

## Validation / outstanding gates
- Run node --test services/neo-efax/*.test.cjs locally.
- Real database concurrency, schema migration and restore tests are still needed, as is pg dependency and restricted test database access.
- Trusted NEOpass authentication, role validation, recipient controls, review routing, reminders, encryption, append-only audit privileges and retention are NOT deployed.
- No confidential documents should enter sandbox hosting. Provider consent, test credentials, a separately reviewed live adapter and independent security review are prerequisites to transmission.
- Keep this as draft; no merge or production change. Related #1441 and #1442.
