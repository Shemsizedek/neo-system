# NEO-FLIP-005 — Persistent Staging Boundary

**Operator:** Shelton Estate & Co.  
**Parent:** NIA-013 / NEO Deal Desk  
**Mode:** isolated staging only; no production release, external outreach, signing or money movement.

## Verified infrastructure

Neon project `neo-deal-desk-staging` (project `mute-rice-57396659`) and default branch `staging` (id `br-old-violet-ar9cr5mw`) were verified. Database `neo_deal_desk_staging` already contained `public.private_deal_opportunities`, `public.private_deal_opportunity_audit` and `public.neo_sales_leads`.

The additive migration `db/migrations/20261120_neo_flipper_staging.sql` was applied only to the verified staging database. It created `neo_flipper.buyers`, `neo_flipper.listings`, `neo_flipper.deal_previews` and `neo_flipper.audit_events`, without modifying existing public Deal Desk tables. This is a real schema migration, **not proof of running app connectivity**.

## Delivered service

`server/neo-flipper/gate5-service.mjs` exports `createFlipperGate5` and `createFlipperGate5HttpHandler`.
The service requires injected trusted `verifyToken`, `verifyBuyer`, `verifyListing`, `verifyValuation`, `matchBuyer` and a persistent `store`.

- Only a token whose authenticating adapter has verified its signature and current issuer, audience, expiration, active state, subject and scopes can pass.
- Caller must ensure token validation *actually* checks cryptographic signature, not merely forwards user-supplied claims. The module does not embed a production issuer or signing secret.
- Buyer records are restricted to opaque buyer IDs, consent/funds/identity evidence refs, buy box and maximum price. Explicit direct personal identifiers and raw proof/banking data are rejected.
- Listings require Texas, 120+ DOM, active status independently attested within 72 hours, and verified data rights. Ordinary public HAR pages do not grant commercial machine access.
- Requests require unique idempotency keys. New evidence is checked before writes. Opt-out suppresses buyers from all future matches.
- Preview records contain research-only matches, zero recognized revenue, and no signed contract or sent-contact claims.
- No outbound messaging, contract signing, escrow transactions or production deployment occurs.

`server/neo-flipper/gate5-postgres-store.mjs` uses parameterized PostgreSQL statements and transactional audit/idempotency writes. It does not create database roles or perform migrations. It requires a private, least-privileged connection pool and an isolated server network boundary.

## Verification

- Eleven local Node tests passed for a separate SQLite reference adapter, including restart persistence, backup/restore, consent withdrawal, authorization and fail-closed provider errors.
- The **nine committed** `gate5-service.test.mjs` cases passed in an isolated JavaScript replay using the exact connector-fetched source. Official GitHub Node CI still must pass.
- Real provider attestation, NEOpass issuer integration, isolated database role and persistence adapter against the actual Neon connection are **not yet tested end-to-end**.
- Staging database table existence was verified by Neon SQL catalog query. No real buyer, seller, PII, listings, bank records or transaction records were inserted.

## Operational/production blockers

1. Provision dedicated least-privileged staging Postgres role with secrets in Render secret manager; no public connection or hardcoded credentials. Confirm service-to-Neon TLS, network restrictions and key rotation.
2. Authenticate NEOpass issuer tokens cryptographically with audience `neo-flipper-staging`, scope mapping and revocation/expiry handling. No token self-attestation.
3. Independently validate source commercial-use license, listing status and closed sales; connect a real provider only after authorization. Secure vault for buyer KYC and consent.
4. Real protected NEO Deal Desk handoff, dedupe, owner review and backup/restore of Neon staging.
5. End-to-end staging tests for token forgery, stale updates, permission revocation, privacy, replay/idempotency, buyer opt-out, rate limits, escrow receipts, restore and rollback.
6. Texas qualified counsel signs off specific principal-contract acquisition, disclosures, assignability, seller consent, signatures and closing path.
7. Keep incoming assignment payouts inbound-only and reconcile independent settlement and bank confirmation. No agent-initiated outgoing payment approval is necessary for mere receipt.

### Test commands

`node --test server/neo-flipper/gate5-service.test.mjs`

`node --test server/neo-flipper/*.test.mjs`

The second command must pass before merging. A private encrypted data store and backups are still necessary for actual production; development artifacts and fixtures are not a KYC vault.

## Next gate

NEO-FLIP-006: implement real NEOpass issuer-bound verification and a least-privileged protected staging deployment on Render, exercise the Postgres adapter with synthetic data, verify recovery and audit evidence, and keep live negotiation and signing gated. Approval is required before any new paid service or production change.
