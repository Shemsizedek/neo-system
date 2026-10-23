# KI-021 — Protected GISS Secret Manager IAM verification

**State as of October 23, 2026: implementation on a review branch; production identity certification is BLOCKED.**

## Verified prior gates

- NEO Core API: Render neo-platform-api-recovery serves KI-020 merge ecc4a952ed7c1c4b752213fcbc2ec729ab60cdd3 as live.
- Noogle Pages: https://github.com/Shemsizedek/neo-system/actions/runs/39984353598 succeeded for the same commit; public Noogle has 12 indexed documents including the reviewed World Library landing page.
- The protected KI-016 NEOpass production-signing metadata workflow has **no completed manual invocation** found in the latest 73 manually dispatched GitHub workflows. The October 15 GISS secret binding checks are historical configuration evidence only.
- The historical [GCP runtime IAM audit](https://github.com/Shemsizedek/neo-system/actions/runs/38724274449) **failed** with a Google Cloud billing-disabled permission error. Billing has not been changed.
- Seven existing connected database assets—two Render and five Neon—belong to Noogle Connect development, NEO Pads, GEM Approvals, Oracle, Bank, CreditStore and Deal Desk. None is an authorized dedicated KNOWINDEX production database.

## New KI-021 check

The existing, manual-only protected workflow is hardened in .github/workflows/ki016-gcp-neopass-metadata-audit.yml, rather than creating a second credential workflow. It now:

1. Requires reviewed main and the existing holytemples-production protected GitHub environment before GitHub OIDC/Google Workload Identity Federation authentication.
2. Reads the Cloud Run metadata for exactly neo-temple-giss; it neither deploys a revision nor retrieves any JWT secret value.
3. Requires exactly one configured NEO_PASS_JWT_SECRET Secret Manager reference, a well-formed version and matching project ID, a named dedicated runtime service account, an OAuth client ID, and an **explicit JWT issuer**. Previously the metadata preflight could report ready when the issuer was absent; that is corrected.
4. Resolves the referenced Secret Manager name *only into a mode-0600 ephemeral runner file*, never an Actions output, comment, job summary, or artifact. All temporary metadata, policy, and diagnostic files are removed on exit.
5. Reads only gcloud secrets get-iam-policy for the exact referenced secret. It checks that the runtime service-account principal has a direct, unconditional roles/secretmanager.secretAccessor grant. A conditional-only grant, no grant, a different principal, or an observed overprivileged secret role causes failure.
6. Emits **Boolean-only, non-sensitive evidence**. It reports billing-disabled, IAM-permission-denied, or policy-unavailable failures as stable redacted codes. It never prints raw IAM policy, secret name, service-account email, OAuth client ID, token, full GCP error, or secret contents.
7. Preserves a strong non-claim: observing a direct secret-level IAM policy grant does **not** prove the actual deployed runtime can read the secret. Project/group inheritance, deny policies, revision readiness, effective runtime access, active token issuance, issuer validity, real member roles and production backup/restore still require independent checks.

The synthetic CI at .github/workflows/ki021-iam-audit-safety.yml has **no OIDC permission and no cloud credentials**. It tests exact principal matching, conditional grants, overbroad roles, missing issuer/version, different project, literal secret, duplicate settings, command-line private output and manual-only protected workflow structure. Passing this CI does not count as a protected production audit run.

## Protected audit execution boundary

The verified GitHub connector supports reading workflows and run logs, but **does not expose workflow_dispatch**. An authorized production operator must therefore open:

https://github.com/Shemsizedek/neo-system/actions/workflows/ki016-gcp-neopass-metadata-audit.yml

Select **Run workflow** on reviewed main, and complete any holytemples-production approval required by GitHub. The workflow performs read-only metadata and IAM policy queries, and should report a safe blocker if IAM access or billing is unavailable.

**No GCP billing activation is approved by KI-021.** If the audit returns BLOCKED_GCP_BILLING or BLOCKED_IAM_PERMISSION, retain the blocked evidence and obtain explicit owner approval before any change; do not guess at credentials or bypass the protected environment.

## Remaining live activation gates

- Confirm actual GISS runtime effective Secret Manager access and verify a real issued NEOpass token, expiration, audience and revocation.
- Verify a consenting active contributor and a different curator against the authoritative registry and separately approved allowlists.
- Obtain authorization for an isolated production KNOWINDEX Postgres database with audited least-privilege grants, off-host backups and a second-environment restore. Do not migrate data into another NEO workstream's storage.
- Independently review all six KI-018 source proofs. Only two distinct, accountable operator/security signers may authorize a short-lived single-contribution pilot through separate trusted keys.
- Confirm one-record quota, approval/review separation, withdrawal, audit hash integrity, emergency disablement, and unchanged public Noogle index. After the pilot, knowledge writes must return HTTP 503 again.

**No KNOWINDEX knowledge writes, token transfers, wallet signing, GCP billing, paid resources, or NEO Crown Chain transactions are enabled or authorized by this gate.** Operational issue: [#1180](https://github.com/Shemsizedek/neo-system/issues/1180).
