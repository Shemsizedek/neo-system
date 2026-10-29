# CES runtime provisioning — 2026-10-29

The operator authorized adding the runtime, provisioning its secrets, testing and importing after successful checks. The target is the existing Render NEO workspace and the existing Neon `neo-bank-staging` project, branch `main`, database `neobank_staging`.

## Runtime

`deploy/ces-read-runtime/start.mjs` starts an HTTP service on `0.0.0.0:$PORT`. Creation of a dedicated free Render service was rejected because the Hobby workspace is limited to 25 services. No service was created. This is staging: Render's free services can sleep, and no 24/7 production availability is implied.

The prepared fallback is the existing **neo-oracle-staging** service, ID `srv-dbcn2oqvcj2c73f76um0`, in NEO workspace `tea-db8bbpij9qps73cb7gb0`. `start-shared.mjs` preserves the primary Oracle request handler and mounts the CES runtime only under `/ces/`. The primary server source blob is identical at the currently live commit `c45916a97ba3106c6c927b06e2b9b9171894725d` and at this feature branch's base. A local routing test verifies that `/health` continues to reach the primary handler while `/ces/health` reaches CES and `/ces/v1/imports` remains authenticated.

Automatic approval review rejected provisioning the database connection, control token and import enablement on this shared host, citing unconfirmed target identity, compatibility and scope. That provisioning action did not run; the existing service's settings and environment were not changed. Explicit approval of this named shared-host fallback is required before deployment continues.

Proposed service configuration after approval:

| Setting | Proposed value |
| --- | --- |
| Branch | `fix/ces-nmni-authentication-proof-20261029` |
| Build | Existing Oracle tests, all CES/bot tests, then `npm install --prefix deploy/ces-read-runtime --ignore-scripts --no-audit --no-fund` |
| Start | `node deploy/ces-read-runtime/start-shared.mjs` |
| Auto deploy | Off |
| Plan | Existing free plan |
| CES prefix | `/ces/` |

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

The restricted database login is provisioned in Neon. Its connection and the generated runtime control token are prepared for Render server environment secrets; the shared-host write was rejected and they have not been installed in Render. They are never committed. TLS certificate verification remains enabled. The database schema file contains no passwords.

The import stores exact decimal strings, source timestamps, native `NEO` units, the source path and a SHA-256 identifier. Repeating the identical snapshot does not duplicate it. Historical turnover is not posted to member accounts, converted into spendable funds, or treated as USD reserves. No transfer or V-Dollar issuance endpoint exists in this runtime.

## CES credential handoff

The runtime needs `NEO_CES_NMNI_USERNAME` and `NEO_CES_NMNI_PASSWORD`. The administrator identifier is known but neither CES credential variable has been provisioned in Render. The existing CES password must be entered directly into the approved service environment by the operator. The authenticated browser session does not supply a reusable server password. Do not paste the password in chat or copy cookies out of the browser.

After that secret is saved and deployed, call `/v1/auth/check` and require NMNI administrator proof. Then call `/v1/collect-import`; operator import permission is already granted. `NEO_CES_IMPORT_ENABLED=true` enables only the source-table import. Both endpoints fail closed while CES credentials or administrator proof are unavailable.

## Validation and rollback

Run `node --test server/neo-bots/*.test.mjs apps/neoscan/adapters/ces/*.test.mjs`. Coverage includes authentication failures, admin transitions, cross-origin redirects, exact decimal preservation, import idempotency, token enforcement, request-body rejection, browser-origin rejection, explicit import enablement and secret-safe errors.

All 88 local tests passed. No live unattended CES login or source import has been performed, and the new source-import table remains empty.

For a shared-host rollback, restore the captured service branch `main`, start command `node server/neo-prime/server.mjs`, and build command `node --test server/neo-prime/*.test.mjs server/neo-router/providers.test.mjs server/neo-router/vertex-provider.test.mjs`, and deploy the previously live commit `c45916a97ba3106c6c927b06e2b9b9171894725d`. The captured live deploy is `dep-dbdgrpnavr4c73a1nn10`. Keep automatic deploys off. Remove only the newly added CES environment keys if the runtime is withdrawn. Do not suspend the shared host or delete preserved source imports.
