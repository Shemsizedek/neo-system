# CES runtime provisioning — 2026-10-29

The operator authorized adding the runtime, provisioning its secrets, testing and importing after successful checks. The target is the existing Render NEO workspace and the existing Neon `neo-bank-staging` project, branch `main`, database `neobank_staging`.

## Runtime

`deploy/ces-read-runtime/start.mjs` starts an HTTP service on `0.0.0.0:$PORT`. Deploy the reviewed feature branch on Render's free plan with automatic deploys disabled. This is staging: Render's free services can sleep, and no 24/7 production availability is implied.

The only unauthenticated endpoint is `GET /health`; it reports service/database health without returning account data. The other routes require a strong server-side bearer token and reject browser-origin requests:

| Route | Behavior |
| --- | --- |
| `GET /v1/status` | Non-secret configuration presence and disabled financial-write status |
| `GET /v1/imports` | Metadata for the most recent 20 source imports |
| `POST /v1/auth/check` | Verify the NMNI member session and the explicit administrator transition |
| `POST /v1/collect-import` | Verify administrator access, read the allowlisted trading-statistics report and persist its source rows |

Both POST routes reject request bodies. Clients cannot supply arbitrary CES URLs, transaction instructions, or HTML. Collection follows only the member page's explicit Administrator Functions link, checked for the expected same-origin login route and NMNI administrator identity. Credential-bearing transition URLs remain transient and never appear in results or manifests. Login and administrator markers are required before report collection. The exact eight source columns must match before records are parsed.

## Provisioned database boundary

A dedicated `neo_ces_source_imports` table was added to the existing staging database. The new `neo_ces_runtime` login role is not a superuser, cannot create databases or roles, and has no inherited roles. It has SELECT and INSERT on the source-import table, with neither UPDATE nor DELETE. Verification confirmed no SELECT, INSERT or UPDATE access to `neo_bank_accounts`, `neo_bank_entries`, `neo_bank_idempotency` or `neo_bank_offers`.

The database connection and runtime control token are provisioned as Render server environment secrets and never committed. TLS certificate verification remains enabled. The database schema file contains no passwords.

The import stores exact decimal strings, source timestamps, native `NEO` units, the source path and a SHA-256 identifier. Repeating the identical snapshot does not duplicate it. Historical turnover is not posted to member accounts, converted into spendable funds, or treated as USD reserves. No transfer or V-Dollar issuance endpoint exists in this runtime.

## CES credential handoff

The runtime needs `NEO_CES_NMNI_USERNAME` and `NEO_CES_NMNI_PASSWORD`. The known administrator identifier is provisioned; the existing CES password must be entered directly into the Render service environment by the operator. The authenticated browser session does not supply a reusable server password. Do not paste the password in chat or copy cookies out of the browser.

After that secret is saved and deployed, call `/v1/auth/check` and require NMNI administrator proof. Then call `/v1/collect-import`; operator import permission is already granted. `NEO_CES_IMPORT_ENABLED=true` enables only the source-table import. Both endpoints fail closed while CES credentials or administrator proof are unavailable.

## Validation and rollback

Run `node --test server/neo-bots/*.test.mjs apps/neoscan/adapters/ces/*.test.mjs`. Coverage includes authentication failures, admin transitions, cross-origin redirects, exact decimal preservation, import idempotency, token enforcement, request-body rejection, browser-origin rejection, explicit import enablement and secret-safe errors.

For a staging rollback, disable `NEO_CES_IMPORT_ENABLED` and deploy. Suspending the dedicated runtime stops further collection without modifying existing bank account tables or deleting preserved source imports. Retain the imported source snapshots for reconciliation.
