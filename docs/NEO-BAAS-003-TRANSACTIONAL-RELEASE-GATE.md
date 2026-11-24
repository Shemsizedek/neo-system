# NEO–BAAS–003 — Production-scale transactional controls

**Status:** implementation proposal, not approved regulated financial operations.

Existing NEO Bank code remains the authoritative product. This gate adds an isolated PostgreSQL simulation ledger as evidence for scaling architecture without altering existing `neo_bank_*` tables or activating external money movement.

## Technical contract
- Application-level tenant-scoped authorization and PostgreSQL composite foreign keys.
- Exact decimal minor units as strings; PostgreSQL `bigint` storage.
- Unique tenant/idempotency combination, advisory transaction lock, and payload-conflict detection.
- PostgreSQL transaction encloses journal and both entries; deferred database balance trigger rejects mismatches.
- Cross-tenant account references denied; absent accounts abort journal.
- Synthetic-only; no HTTP routes and no banking provider integration.

## Known limitations that block production financial operations
- No verified regulated bank partner, account/program agreement, deposit insurance authority, or money transmission legal analysis.
- No KYC/KYB/AML/sanctions processing, vendor agreements or consumer disclosures.
- Database grants and row-level security are not production hardened; separate application role and restricted grants required.
- No production operational telemetry, backup restoration evidence, disaster recovery test, independent security assessment or reconciliation against provider statements.
- App transactions do not substitute for authorization by financial institutions.
- Trigger enforces balance on inserted lines but an empty journal created via direct SQL does not trigger that check; restrict direct SQL insert grants and add write-service validation before operational use.

## Explicit compliance owner matrix (requires named accountable individuals)
| Service | Responsible authority | Status |
|---|---|---|
| Consumer/business fiat deposits, FDIC representations | Contracted sponsor bank | Not verified |
| ACH, domestic wire, card issuance | Sponsor bank and approved processors | Not verified |
| KYC, KYB, AML, sanctions and suspicious activity handling | Licensed institution + contractually delegated NEO controls | Not verified |
| Bitcoin/Counterparty custody and NOMNI payment or redemption | Legal/compliance counsel + authorized service provider | Not verified |
| Internal NEO financial software, audit and technical ledger | NEO engineering/security | Source identified; controls pending validation |

## Automated verification
The dedicated GitHub Actions workflow runs Node 24 tests with PostgreSQL 16.
On a local disposable Postgres instance:
`NEO_BAAS_TEST_DATABASE_URL=postgres://... npm test --prefix server/neo-bank`

Tests check 12-way concurrent idempotency, payload mismatch, transaction rollback,
tenant isolation and database-enforced journal balance.

## Release controls
Release customer-facing informational/software functions only after an independently
verified service health check and documented deployment authorization.
**No customer funds, deposit or payment endpoints, custody, issuance, or ledger values
presented as bank deposits until authority is independently evidenced.**
