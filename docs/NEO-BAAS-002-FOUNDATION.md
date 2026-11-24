# NEO–BAAS–002 — Banking-as-a-Service foundation (development only)

## Scope
An additive, synthetic-only module in `server/neo-bank/baas-foundation.mjs`.
It does **not** expose HTTP routes, modify the community finance transfer service,
open bank accounts, move assets, issue payment instruments or interact with a provider.
No production configuration changes.

## Contract
- Tenant IDs and scopes must match the authenticated actor.
- Journal amounts are positive *string* minor units, validated and manipulated via BigInt.
- Each proposed journal has equal debit and credit totals and distinct accounts.
- Idempotency keys are required but **not persisted**; this module is a planning primitive,
  not a transaction processor.
- The banking provider adapter rejects **all** actions until a licensed/approved partner,
  contracts, policy, technical controls and separate rollout authorization exist.

## Development check
Run `npm run neo-bank:test` from the repository root (Node 24) or
`npm test` in `server/neo-bank`. The new suite exercises tenant isolation,
amount validation, balanced journals and denied banking operations.

## Next gate — NEO–BAAS–003
1. Confirm service/CI health and check existing NEO Bank regression tests.
2. Add durable multi-tenant PostgreSQL schema and transactional posting with
   account locks, serializable/idempotent write semantics, audit records and rollback.
3. Add KYC/KYB, AML, sanctions, vendor responsibility and partner-led approval matrix.
4. Test concurrent same-key requests, cross-tenant access, crash/rollback,
   debit/credit balancing and reconciliation with disposable PostgreSQL.
5. Independent security/compliance review before any partner connection.
6. No live fiat or crypto money movement; no real customer data in test fixtures.

## Explicit hold
An internal ledger or simulated account must never be labeled as a bank deposit,
FDIC-insured balance, payment account or redeemable NOMNI asset.
