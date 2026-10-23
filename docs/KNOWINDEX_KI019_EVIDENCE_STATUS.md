# KI-019 — Production evidence gate

**Status: BLOCKED — public Noogle search continues; KNOWINDEX knowledge writes remain disabled.**

Checked on 2026-10-23:

- Main deployed source is KI-018 merge f41c3185da1b2b2151c047cf20b0166603b05c69.
- Render `neo-platform-api-recovery` reports that commit live.
- The KI-016 protected Cloud Run metadata audit has **no recorded manual workflow run**. Earlier October 15 audits found an existing GISS signing reference, but the IAM audit failed with billing-disabled; these are not current issuer, role, or runtime proof.
- Connected Render shows **no dedicated approved KNOWINDEX production database**. `noogle-connect-dev` (free) expires November 15, 2026; `neo-pads-production` belongs to a different workstream. Do not reuse either.
- No real, consenting contributor and independent curator have been certified through actual NEOpass sessions. CI identities are synthetic only.
- KI-015/KI-018 PostgreSQL test restore is **disposable CI storage**, not a verified production off-host backup or rollback.
- No production Ed25519 operator/security trust anchors or signed authorization statement have been supplied.

## Machine-readable preflight

`data/knowindex/ki019-readiness.json` explicitly marks all six original evidence categories unverified or blocked. `server/neo-knowindex/production-evidence.mjs` and its CI test produce **a report only**. Even a fully externally reviewed evidence register has `productionWritesApproved:false`; the existing KI-018 double-signed authorization and live Postgres/NEOpass checks remain mandatory.

Evidence hashes and URLs, or a contributor's own declaration, do **not** prove that IAM permission, real identity, backups, or independent approvals actually exist. Evidence must be inspected from trusted source systems and independently countersigned outside the repository. The manifest contains no tokens, credentials, full member IDs, email addresses, keys, or private database endpoints.

## Work completed this gate

- Current connected Render storage and API deployment were inspected without changes.
- The authorized GitHub workflow inventory shows **no completed KI-016 protected production audit**; no suitable workflow-dispatch action is exposed through the connected GitHub tool.
- Confirmed an existing GitHub Issue [#1180](https://github.com/Shemsizedek/neo-system/issues/1180) and linked Linear item NEO-280 track actual operational certification.
- Added a fail-closed readiness matrix, negative security tests and CI regression checks.

## Blocking decisions, not automatic actions

1. Security/operator must authorize and manually dispatch the protected KI-016 production Cloud Run metadata audit, or grant a compatible scoped execution interface. Do not bypass environment approval.
2. Resolve cloud billing/IAM only with explicit approval; do not incur new spending.
3. Verify a real consenting contributor and separately authorized curator, including NEOpass issuer/revocation and live registry roles, without storing their bearer credentials.
4. Authorize a dedicated, backed-up and restore-tested PostgreSQL service for KNOWINDEX, with no access to NEO Pads or expiring Noogle development data.
5. Rehearse reversible disablement and obtain the two independent KI-018 signed approvals before a single-record write pilot.

**No token transactions, wallet operations, NEO Crown Chain signing, new billing, private source copying, or production knowledge writes are permitted by KI-019.**
