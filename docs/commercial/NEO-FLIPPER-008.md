# NEO-FLIP-008 — Protected service boundary hardening

**Operator:** Shelton Estate & Co. / NEO Deal Desk. **Status:** Draft PR only; not live.

## Existing scratch database and identity boundary
- `neo-deal-desk-staging` project `mute-rice-57396659`.
- Default staging branch `br-old-violet-ar9cr5mw`; synthetic scratch branch `br-holy-lab-ar0at3wz`.
- Dedicated `neo_flipper_staging_app` role still **NOLOGIN** and has no provisioned secret. Read-only Neon verification on the scratch branch reconfirmed buyer read access, no DELETE on buyers/audit, and no read of unrelated `public.private_deal_opportunities`.
- Direct connection as the restricted role was attempted for read-only verification and refused due to **missing authentication credentials**. Do not claim a live authenticated service-to-database connection or bypass this protection with owner login.
- No new Render service, account expense, real buyer, seller, contract or payment.

## Security findings addressed in this gate
1. **Replay key binding:** `gate5-postgres-store.mjs` now requires that a reused idempotency key match payload hash **and** actor subject, operation and entity ID. A key replay on another buyer or under another operator fails closed.
2. **Concurrent buyer withdrawal:** a preview write obtains PostgreSQL `FOR SHARE` locks on the current active listing and all referenced eligible buyer rows. It rejects revoked opt-in, stale funds or expired listing status before writing the preview. Concurrent UPDATE suppression must await these locks, preventing the opt-out from racing a committed preview write.
3. **Matching outage:** `gate5-service.mjs` fails the entire preview with a service-unavailable error when the matching provider throws; it cannot silently return a partial list as an apparently valid match result.
4. **Listing source host verification:** HAR-specific license check uses an exact host or subdomain boundary, not a broad suffix that could incorrectly classify unrelated domains.
5. **Regression suite:** `server/neo-flipper/gate8-postgres-boundary.test.mjs` covers replay mismatch, row-lock sequencing, opt-out races, expired listings, rollback and duplicate buyer IDs.

## Explicit scope and test limitations
- Gate 7 already validated real **synthetic** PostgreSQL inserts in the separate scratch branch, default staging isolation, duplicate unique-key behavior, and buyer suppression at DB level.
- Gate 8 code is reviewed through GitHub Actions Node 24 tests. PostgreSQL transaction tests use a mocked connection pool and must **not** be described as real Neon application-credential tests.
- The live NEOpass issuer, revocation and buyer/source/valuation attestations, protected secrets, least-privileged login and HTTP service deployment remain blocked.
- The Gate 7 scratch branch is intentionally retained; deletion, promotions, and overwrites require separately authorized action.

## Next milestone
**NEO-FLIP-009:** security-reviewed issuer integration and isolated stage-only credential provisioning; execute real service-to-Neon integration under the restricted role on a new synthetic scratch branch, then backup/recovery and rate-limit tests. No live outreach, signing, or money movement before authorization, provider verification, and Texas legal review.

## Rollback
Keep PR unmerged. If a test changes only the scratch branch, keep the synthetic records for review and do not delete anything automatically. No production runtime or default staging data was changed by Gate 8.
