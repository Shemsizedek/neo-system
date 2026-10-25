# KI-022 — Protected Neopass audit receipt and operator handoff

**Status (October 25, 2026): BLOCKED for production knowledge writing.** The KI-021 protected audit code is merged and the NEO Platform API is live, but the protected production IAM workflow has not been observed as successfully executed. This gate creates a safe mechanism for correlating a future execution; it does not execute the protected workflow itself.

## Read-only inspection

- At review time the connected GitHub main branch and live Render neo-platform-api-recovery deployment reported the same current commit, 8d6cb04efe731aaa268976690c177e89b19f3421. Other NEO workstreams may merge independently; do not assume this commit remains the head.
- The accessible manually dispatched GitHub run inventory contained 73 runs and no successful KI-016 Neopass Production Signing Metadata Audit. The October 15 runtime IAM authorization audit failed; prior Cloud Run secret-reference metadata is not effective IAM evidence.
- Render inventory remains noogle-connect-dev (free development storage, expiry November 15, 2026) and neo-pads-production (NEO Pads); neither is approved KNOWINDEX production storage.
- Neon inventory now includes **six** separate staging projects: Careers, GEM Approvals, Oracle, Bank, CreditStore and Deal Desk. The prior KI-020 register contained five; data/knowindex/ki020-storage-candidates.json is refreshed with Careers as an eighth currently visible database asset across Render and Neon.
- No dedicated persistent KNOWINDEX production database, production restore/backup certificate, real consenting contributor + independently authorized curator, or valid two-party KI-018 signed activation was established.

## New source-run monitor

The added GitHub workflow at .github/workflows/ki022-protected-audit-receipt.yml is a **read-only** monitor triggered by workflow_run completion for the existing protected KI-016 Neopass Production Signing Metadata Audit. It never invokes the protected audit, requests GCP credentials, opens Secret Manager, changes IAM, or modifies a NEO service.

The script at scripts/ki022-protected-audit-receipt.mjs accepts only a valid GitHub-issued workflow run event. It verifies:

1. Repository and head repository must both be Shemsizedek/neo-system, default branch and source-run branch must be main.
2. Source run must identify the exact protected workflow name and workflow file; it must be a manually dispatched workflow_dispatch, never push, PR, fork or scheduled execution.
3. Completed status, canonical GitHub Actions URL and numeric run/workflow IDs, a valid commit SHA, and a recent internally consistent timestamp are required.
4. A source workflow success produces the narrow status PROTECTED_AUDIT_WORKFLOW_SUCCEEDED_ONLY; failed, cancelled, stale, spoofed or malformed runs remain blocked.
5. Output contains only allowlisted non-sensitive run metadata and a SHA-256 receipt correlation hash. It never prints workflow event payloads, actors, identities, service-account names, client secrets, policies or tokens.
6. The monitor independently invokes the existing live read-only API and public Noogle smoke after source completion, even if the source audit fails. The contribution endpoint must still deny writes.

**Important:** A successful workflow run is **not** verification of effective Cloud Run secret access, user consent, current Neopass token issuance, curator permissions, actual off-host recovery, or operator/security approval. The monitor always returns productionWritesApproved:false. It does not automatically change any repository production evidence manifest or write-enable flag.

The PR test workflow exercises synthetic workflow events and the historical storage-isolation regression with no cloud credentials. It also verifies that both the monitor and source workflow retain their restricted permission boundaries.

## Actual operator step that cannot be completed through the GitHub connector

An authorized operator must manually open the reviewed GitHub Actions workflow:

https://github.com/Shemsizedek/neo-system/actions/workflows/ki016-gcp-neopass-metadata-audit.yml

Select **Run workflow** on the reviewed main branch and satisfy GitHub's holytemples-production environment review. **No change to cloud billing or IAM is authorized by this instruction.** If the run reports BLOCKED_GCP_BILLING or BLOCKED_IAM_PERMISSION, record the blocker and request explicit approval before any change.

The KI-022 monitor will correlate a subsequent source-run completion automatically through GitHub Actions. A source-run success still requires independent effective runtime/issuer verification and a controlled production storage approval before knowledge writes.

## Remaining activation dependency chain

1. Protected Cloud Run/Secret Manager audit executed and source proof reviewed; separately verify effective runtime access and issued token contract.
2. A consenting active Neopass contributor and independent approved curator verified against the live membership registry and allowlists.
3. An operator-approved isolated KNOWINDEX Postgres database with least-privilege runtime, off-host backup schedule and independently restored snapshot.
4. Independent operator and security approval over the six KI-018 source evidence packets, matching deployed SHA, database fingerprint, two distinct actor fingerprints and a one-record quota.
5. Only then a reversible one-record live pilot, withdrawal/audit verification and immediate safe disablement. Public Noogle must never publish an unreviewed contribution.

**No production IAM changes, Google Cloud billing activation, data-store provisioning, private data extraction, knowledge writes, wallets, token issuance, transfers or NEO Crown Chain signing are authorized or performed by KI-022.**

Operational blocker register: https://github.com/Shemsizedek/neo-system/issues/1180
