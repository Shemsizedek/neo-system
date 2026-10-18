# NEO-TMS-G003 — Treasury Persistence Acceptance Gates

Status: SCHEMA DRAFT / NOT DEPLOYED.

## Delivered
- PostgreSQL draft tables for entities, funds, accounts, journals, journal lines, approvals, assessments, beneficiary designations, distributions and audit events.
- Referential constraints, enumerated workflow states, exact integer-unit numeric storage and source idempotency keys.

## Required before production
1. Transaction-scoped posting function: verify per-currency balance, matching account currency, valid fund, available restricted-fund balance, independent approvers, then post atomically.
2. Enforce immutable posted journals and append-only audit events with restricted database roles; add concurrency/idempotency tests.
3. Integrate authenticated trustee/treasurer/revenue-officer authorization, multi-tenant temple isolation and row-level security.
4. Add trust instrument validation and signed approval evidence before beneficiary release.
5. Implement member account and Chaplaincy Window React views backed by authenticated API, not fabricated balances.
6. Add migration rollback plan, encrypted backups, restore drills and integration tests on actual PostgreSQL.
7. Define ∞ unit precision and lawful conversion policy; do not assume ∞1 = USD 1.
8. Validate legal and regulatory requirements before offering securities, banking, tax enforcement, custody or live transfers.

No live payments, securities sales, disbursements, tax collection or production database changes are enabled by this commit.
