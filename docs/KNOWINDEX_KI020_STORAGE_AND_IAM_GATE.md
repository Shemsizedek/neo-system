# KI-020 — Cross-cloud storage ownership and protected NEOpass readiness

**Status: BLOCKED for live KNOWINDEX knowledge writes.** Engineering safeguards in this gate are read-only and do not represent permission to activate a production endpoint.

## Latest verified state (2026-10-23)

- The current GitHub `main` head at time of inspection was `18cbaf9d7ef5c4b7c0f514b7216af546638a1092`. The connected Render `neo-platform-api-recovery` service deployed that commit as **live**. GitHub Pages deployment run [#39981688176](https://github.com/Shemsizedek/neo-system/actions/runs/39981688176) **succeeded**. The superseded KI-019 Pages run #39981499692 was cancelled and is not release proof.
- No run titled KI-016 NEOpass Production Signing Metadata Audit appeared in the latest 73 manually dispatched workflows. Manual protected IAM attestation has not been observed; historical October 15 billing-disabled IAM remains a blocker.
- Render has two databases only: `noogle-connect-dev` (free, expires November 15, 2026), and `neo-pads-production` (NEO Pads workstream). Neither is KNOWINDEX production storage.
- Neon connector exposes five additional existing projects: `neo-gem-approvals-staging`, `neo-oracle-staging`, `neo-bank-staging`, `neo-creditstore-staging`, and `neo-deal-desk-staging`. All are staging projects dedicated to other workstreams. Their configured branch history retention is six hours, which is not evidence of a separately retained, verified KNOWINDEX backup. None may be reused without an independent authorization decision.
- No separate approved `knowindex` production project, real contributor-plus-curator identity pair, protected issuer/secret IAM attestation, off-host recovery drill, or double-signed KI-018 activation is verified.

## New acceptance boundary

`data/knowindex/ki020-storage-candidates.json` records all seven connected Render/Neon database candidates without secrets or credentials. `server/neo-knowindex/storage-selection.mjs` and tests reject staged/test assets, cross-workstream production stores, absent evidence, missing operator/security approvals, missing least-privilege runtime, incomplete off-host recovery, or ambiguous selection. **Even a complete inventory screening only reports `CANDIDATE_REVIEW_COMPLETE` with `productionWritesApproved:false`.** It is never a replacement for the actual KI-018 signed envelope and runtime identity/database attestations.

## Pending external certification

1. An authorized operator must execute the reviewed, manual-only protected GCP signing metadata workflow from `main`. Never bypass environment review or activate GCP billing without explicit approval.
2. Independently verify a consenting active NEOpass contributor and distinct approved curator, including current membership and revocation status.
3. Authorize an isolated production KNOWINDEX Postgres database, with dedicated owner and migration/runtime roles. Existing NEO Pads and other staging projects must not be repurposed.
4. Prove off-host backup retention and independent restore of that specific live database; publish only redacted attestations and audit-head hashes.
5. Rehearse disablement and obtain two distinct cryptographic KI-018 operator/security approvals before permitting one live contribution; then disable writes again and verify public Noogle remains unchanged.

This gate performs no billing changes, new database provisioning, token transfers, wallet signing, Crown Chain writes, or live KNOWINDEX contributions. Track approval dependencies at [#1180](https://github.com/Shemsizedek/neo-system/issues/1180).
