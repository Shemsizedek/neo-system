# NEO-FLIP-009 — Restricted Login and Scratch-Only Runtime

**Principal:** Shelton Estate & Co. **Coordinator:** NEO Deal Desk / NIA-013.  
**Date:** 2026-11-21. **Scope:** synthetic, separate Neon scratch branch; not a live business service.

## Verified Neon connection

Project `mute-rice-57396659`, database `neo_deal_desk_staging`, parent `br-old-violet-ar9cr5mw`, scratch `br-holy-lab-ar0at3wz` (`neo-flipper-gate7-synthetic-20261121`).

The previous `neo_flipper_staging_app` role was originally NOLOGIN and had no password. Temporarily allowing LOGIN on the *scratch copy* did not permit a password rotation because Neon reported no existing password. The scratch role was restored to **NOLOGIN**; the parent branch's role remains NOLOGIN and unchanged.

A **separate scratch-only login** `neo_flipper_gate9_app` was created using Neon's database-scoped `read_write` role creation (not admin). Credentials were returned by the connector but not copied into this repository, document, issue, or application source. Its grants were then tightened:
- LOGIN permitted; no CREATE ROLE or CREATE DATABASE.
- USAGE in `neo_flipper`, SELECT/INSERT/UPDATE for buyers/listings, SELECT/INSERT for preview/audit.
- No DELETE on buyer or audit, no UPDATE on preview or audit, and no SELECT on `public.private_deal_opportunities`.
- Database login verified using `run_sql` with `role_name='neo_flipper_gate9_app'`, reporting `current_user=neo_flipper_gate9_app`.

**Real synthetic write:** Using the restricted role, one SQL statement inserted `B-GATE9SYNTH`, `LIST-GATE9SYNTH`, `GATE9-PREVIEW-001`, `GATE9-AUDIT-001` on scratch. Each insert returned count 1. Parent staging was queried separately and contained **zero** matching Gate 9 fixture rows. These are fake buyer/asset/evidence records, not real transactions or verified income.

## Committed code

- `server/neo-flipper/gate9-scratch-runtime.mjs` wires the Gate 6 JWT verifier, Gate 5 Postgres store and HTTP handler behind an exact branch verification callback. It rejects privileged or unexpected login identities, private Deal Desk permissions, record deletion permissions, and non-`fixture:` buyer/listing evidence and non-synthetic IDs.
- `server/neo-flipper/gate9-scratch-runtime.test.mjs` checks missing attestors, branch mismatch, owner credential rejection, grant boundaries and synthetic restrictions.

**Critical limitation:** The scratch branch attestor is an injected contract and must be implemented with genuine trusted Neon branch metadata and connection identity, not a caller-provided value. The full HTTP handler has **not** been connected to Neon as a deployed service. No real NEOpass token issuer, current membership/revocation provider, protected Render runtime or licensed listing connector has been integrated.

## Remaining Gate 9 completion steps

1. Security-review the staged auth issuer, key custody, branch attestor and secret distribution. Do not substitute demo tokens for real NEOpass identities.
2. Deploy a protected stage-only service using approved provider secrets and network restrictions, if permitted and without creating unapproved spending.
3. Execute **HTTP-to-service-to-Neon** synthetic workflow under `neo_flipper_gate9_app`: signed token, buyer registration, listing import, preview, idempotency, opt-out, outage.
4. Rehearse backup/restore and rollback on a separate isolated scratch branch, without deleting source branch or default staging.
5. Integrate trusted buyer consent/funds, source licensing, sold comps, title/escrow and written disclosure providers before any external wholesaling.

## Rollback / safety

Do not merge draft PR #1443 or deploy to production. No live seller outreach, contract execution, signature delegation, financial transfer or bank instruction was attempted. Scratch role remains usable on scratch only; review credential lifecycle and revoke/rotate before any later provider connection. Do not automatically delete the scratch branch, fixture records or database identity without explicit authorization.
