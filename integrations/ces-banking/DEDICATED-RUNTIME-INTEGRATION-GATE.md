# Project 144 — CES dedicated runtime integration and merge gate

Decision 2026-10-29: Reuse the verified NEO SYSTEM workspace's **neo-ces-read-staging** service, not the older Oracle shared-host path and not another new CES service.

## Verified existing implementation
- Dedicated Render service `srv-dbhtlv4s728c73cuetf0` in NEO SYSTEM workspace `tea-dbhtkc8473hc73933img`, free plan, branch `fix/ces-nmni-authentication-proof-20261029`, auto-deploy off.
- Render read-only service and deployment inspection reports deploy `dep-dbhtlvcs728c73cueudg`, commit `5afbe4596bba8a887a2f12e8ceed80b059aaa1c8`, status **live**. This verifies a deployed service, **not CES authentication**, live balance import or Modern Treasury reconciliation.
- Companion PR #1273 (`Add CES administrator read runtime and source import staging`) describes a protected server-run source import: `GET /health`, authenticated `GET /v1/imports` and `GET /v1/status`, `POST /v1/auth/check` and `POST /v1/collect-import`.
- Service has **no operational CES password, runtime bearer token or restricted database connection** installed in the dedicated workspace; historical NMNI imports remain unverified there. Previous separate Neon table and restricted role were provisioned in another staging context; do not assume cross-workspace credentials.
- Imports use `neo_ces_source_imports` with SHA-256 import id, NMNI exchange, exact source date, row count, and historical Trading Statistics summary. This is a **source evidence table** and never a NEO Bank balance, bank account, wire instruction or NOMNI cash reserve.

## Collision between PR #1272 and PR #1273 — DO NOT MERGE BLINDLY
Both branches edit `server/neo-bots/ces-session-adapter.mjs`, but PR #1273 uses a protected member-page proof and an explicitly allowlisted **transient legacy NMNI admin transition**. PR #1272's earlier strict generic URL-query rejection and `inventoryLinks` filtering block every query-bearing admin transition. Blindly combining them would break the dedicated staging reader.

Integration resolution, in order:
1. Keep the dedicated PR #1273 server-run login proof, bounded NMNI Trading Statistics ingestion, authenticated import API, and private source-store as primary.
2. Preserve the security objective from PR #1272: never persist or log raw credential-bearing URLs/cookies/hidden form values. The dedicated transient admin transition must remain internal to the specific validated session and never be returned, persisted, or forwarded to bank ledgers.
3. Rebase/cross-test the two login implementations only after a safe transient-transition design and regression coverage have been reviewed. Until then **PR #1272 is a draft and must not be merged**.
4. Reuse PR #1272's **isolated evidence-only** `ces-source-import-evidence.mjs` and `reconciliation-gate.mjs` as consumers, not as replacements for PR #1273's verified CES login implementation.
5. Resolve the bank bot's caller-supplied `read-only` risk spoofing vulnerability by using authoritative `readOnlyScopes` and runtime validation; keep its regression test when integration branches are consolidated.

## Import metadata contract (PR #1272)
`ces-source-import-evidence.mjs` validates only the restricted PR #1273 `GET /v1/imports` shape (`id`, `exchange_id`, `observed_at`, `imported_at`, `row_count`). It refuses user profiles, raw data, bank identifiers, account balances, passwords and unknown fields. It declares the import as an **unverified historical-trading summary in source unit NEO**, with `neoBankEntriesCreated: 0`, `historyComplete: false` (API returns at most 20), and `financialLedgerPostingAuthorized: false`.

## Operational next gates
- Explicitly authorize sensitive Neon credential and server control-token installation into the **named** dedicated Render service through an approved secure provisioning flow. Do not copy any value into GitHub or chat.
- Enter the CES NMNI password directly into the verified Render environment; rotate previous credential-in-URL exposure first and invalidate past sessions where supported.
- Perform only a protected `GET /v1/status` / `POST /v1/auth/check` using the new server-side runtime token. Verify member and administrator proof, then privately review the bounded NMNI import schema.
- Only after credentials, read-only privileges and source provenance are independently verified, enable bounded source import and check SHA-256 identifiers, idempotency, row count, time and unit. Never post these to member balances.
- Cross-reference existing Modern Treasury sandbox service's own bank-reported observations, without granting CES bots banking credentials or access to NEO Core. No Fedwire, V-Dollar issuance or NOMNI reserve claims.

Status: PR #1272 draft; companion PR #1273 open; no new secret transfer, live CES source import, financial operation, production deployment or account change in this gate.
