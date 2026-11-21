# NEO-FLIP-006 — Staging Identity and Least-Privilege Gate

**Operator:** Shelton Estate & Co.  
**Project:** Project 144 / NEO-FLIP-006  
**Implementation:** Draft PR #1443. No live service, no solicitation, no payments, no signature activity.

## Verified state (2026-11-21)

- Existing **NEO Deal Desk staging** Neon database: project `mute-rice-57396659`, branch `br-old-violet-ar9cr5mw`, database `neo_deal_desk_staging`.
- Existing Flipper schema and tables verified. Existing Deal Desk public tables unaffected.
- Added **NOLOGIN** `neo_flipper_staging_app` Postgres role, with CONNECT on database, USAGE on `neo_flipper` schema; SELECT/INSERT/UPDATE only on Flipper buyers and listings, SELECT/INSERT only on previews and audit. No CREATE DB / CREATE ROLE / replication. No login credential exists.
- Verified this role has access to `neo_flipper.buyers` but **no SELECT on `public.private_deal_opportunities`**.
- Read-only Render workspace inventory returned no NEO Flipper deployment. **Do not describe Flipper as operational on Render.**

## Added code

`server/neo-flipper/gate6-neopass-verifier.mjs`
- HS256 signature verification using timing-safe comparison, strict `alg`, `typ`, issuer `neo-pass`, audience `neo-flipper-staging`, active subject, token ID, 5-minute maximum lifetime, current expiry, and bounded scopes.
- **Mandatory** independent active-membership/role provider and token/session revocation check. Fail closed if either provider cannot establish trust. A verifier cannot accept client-supplied `signatureValidated` fields.
- Signing key must be distinct from production identity secrets, held in a secret manager; this component does not mint credentials.

`server/neo-flipper/gate6-runtime.mjs`
- Must receive a restricted PostgreSQL connection pool and trusted attestation providers.
- Checks actual `current_user`, database name, Flipper schema access, and **inability to read unrelated Deal Desk private opportunities** before constructing its service and HTTP handler.
- Refuses privileged DB owner/admin identities and missing providers, even in staging.

`server/neo-flipper/gate6-neopass-verifier.test.mjs` and `gate6-runtime.test.mjs` test forged/malformed tokens, audience, expiration, revocation, access-scope changes, provider outages and DB-role refusals.
`.github/workflows/neo-flipper-tests.yml` runs all Flipper Node 24 tests on PR changes.

## Not yet connected

- Current NEOpass tokens in `server/neo-platform-api/neopass-google-auth.mjs` have a different general-purpose issuance contract. Do not treat a legacy login session as an `neo-flipper-staging` audience token. A separate reviewed issuer/exchange must issue short-lived scope-specific tokens.
- Current `neo_flipper_staging_app` role is intentionally **NOLOGIN**. Provision a dedicated encrypted secret and restricted login role only after credential security review and staging service isolation.
- A real Neon connection, Render deployment, independent permission attestors, licensed property data, cash-buyer consent and proof-of-funds service, e-sign, and title/escrow provider remain unverified.

## Staging release checklist

1. Independent security review of HS256 issuer trust, replay/revocation, access scopes, session duration, tenant isolation and key custody. Use FIDO2/NEOpass assurance before privileged operator actions.
2. Create a dedicated stage-only least-privilege login principal, managed through Neon with secret rotation and secure Render injection. **Never use the database owner credentials in the Flipper service.**
3. Connect trusted active-membership, revoke-list, buyer verification, source licence, current listing status and valuation attestors.
4. Run `node --test server/neo-flipper/*.test.mjs` and CI on the exact draft branch.
5. Complete synthetic end-to-end tests against isolated database branch only, including insert/read, idempotency conflict, stale-data rejection, opt-out, restart, backup/restore, and provider outage.
6. Review readiness with counsel and owners before any real seller communication, contract or signature.
7. Explicitly approve staging creation if it would incur cost; production remains unchanged.

## Rollback
- **Code:** do not merge PR #1443; rollback of test changes is branch isolation.
- **Runtime:** no Flipper service has been created; nothing to shut down.
- **Database:** maintain existing isolated tables; do not DROP or DELETE automatically. If credential access were granted in the future, revoke that grant as part of a separately authorized incident runbook. Preserve evidence and audit records.
- **Backups:** use verified Neon recovery procedures, restore into a **separate** scratch branch and check counts/foreign keys before any restoration. Do not overwrite staging or production automatically.

## Next gate
NEO-FLIP-007: verified least-privilege live staging integration, issuer/exchange with authenticated roles, end-to-end synthetic records on a temporary scratch database branch, backup/restore and rollback drills, without external outreach or financial transfers.
