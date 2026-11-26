# NEO-FLIP-007 — Isolated Neon Synthetic Transaction Rehearsal

**Date:** 2026-11-21. **Operator:** Shelton Estate & Co. / NEO Deal Desk. **Status:** partial gate completion; DB-only integration verified, live application not deployed.

## Isolated database branch created
- Neon project: `mute-rice-57396659` — existing `neo-deal-desk-staging`.
- Parent: `br-old-violet-ar9cr5mw` / `staging`.
- Isolated child: `br-holy-lab-ar0at3wz` / `neo-flipper-gate7-synthetic-20261121`.
- Database: `neo_deal_desk_staging`.
- Child branch inherited the four `neo_flipper` schema tables.
- This is a real Neon branch, not a fake local database. It is retained for review; **do not automatically delete** or promote it.
- First create-branch attempt failed because this account disallowed overriding suspend interval. Second call used standard allowed compute sizing with no custom suspend setting; succeeded.

## Executed, observed PostgreSQL checks
All data below are synthetic and use `fixture:` evidence references; they are not real leads, buyers, identity attestations, or commercial data.

1. Inserted synthetic `B-GATE7SYNTH` buyer with Houston buy box and an illustrative $250,000 maximum, `LIST-GATE7SYNTH` at a fabricated Houston example address, `GATE7-PREVIEW-001` with an illustrative $150,000 seller ceiling and $8,500 potential net fee, and `GATE7-AUDIT-001`. Executed as a single PostgreSQL transaction.
2. Queried the scratch branch: **1 buyer, 1 listing, 1 preview, 1 audit event**; preview `recognized_revenue_usd = 0.00`.
3. Queried **parent default staging** separately: **0** of the synthetic buyer/listing/preview records. Isolation verified.
4. Repeated the preview insert with the same key and different valuation reference using `ON CONFLICT DO NOTHING`: still exactly **1** preview, the original `fixture:valuation` reference preserved. This verifies database uniqueness/replay non-overwrite, **not** the application-level hash-conflict logic.
5. Marked the synthetic buyer suppressed on scratch: query shows `suppressed = true`, eligible unsuppressed buyers = **0**, revenue still **0.00**.

**No raw PII, seller contact details, bank information, live buyer records, real transactions, offers, or money movement were used.**

## What remains unverified
- Application-to-Neon integration using an authenticated `neo_flipper_staging_app` connection. The role is still `NOLOGIN`; the tool session used elevated database access to write only the synthetic scratch branch.
- Cryptographic NEOpass **issuer** activation and independent live membership/revocation provider; the verifier library and its tests alone are not a live identity system.
- Running the full `gate5-service.mjs` + `gate5-postgres-store.mjs` + `gate6-runtime.mjs` together against the real database under least-privilege credentials.
- Verified backup restore/recovery rehearsal, power-loss recovery, concurrent idempotency conflict behavior and server-side privacy/authorization on actual networked service.
- Actual buyer, comparable-sales and property feed authorization/attestation.
- Separate Render service creation, e-sign, title/escrow integrations and a real Deal Desk persisted handoff.

## Follow-up gate
**NEO-FLIP-008:** security-review a stage-only login credential and trusted NEOpass staging issuer; run end-to-end HTTP/service integration as that least-privileged role against a further disposable scratch branch. Validate rate limiting, idempotency hash conflict, outage/rollback, buyer suppression, recoverability and audit. Add actual protected Deal Desk handoff only after successful checks. Keep production unchanged, spending unapproved, no real solicitations, signatures or money movement.

## Rollback/cleanup
Current scratch branch is isolated and contains only synthetic data. Leave it available as a test record until reviewed. Deletion is destructive and requires an explicit instruction naming this branch; do not delete the parent staging branch. No production services were deployed or modified.
