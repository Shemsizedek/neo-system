# Dedicated CES runtime — 2026-10-29

This record supersedes the shared-host deployment proposal for the CES gate.

## Provisioning gate — 2026-10-31 (America/New_York)

The operator's “Next gate” approved transferring the restricted Neon database credential, generated runtime control token, and NMNI administrator identifier to the named dedicated service. The merge update succeeded without replacing unrelated configuration. `NEO_CES_IMPORT_ENABLED=false` remains in effect.

| Verification | Result |
| --- | --- |
| Deployment | dep-dbjaudrbc2fs73ca6q50 — live |
| Deployed commit | 6df03be3a1c4248aaada9e89160d085ec6c89a15 |
| Deployment completed (UTC) | 2026-11-01T03:17:48.969179Z |
| Build tests | 89 passed, 0 failed |
| GET /health | HTTP 200; database: true |
| Authenticated GET /v1/status | HTTP 200; databaseConfigured: true |
| Authenticated GET /v1/imports | HTTP 200; imports: [] |
| POST /v1/auth/check | HTTP 503; ces_credentials_not_configured |
| POST /v1/collect-import | HTTP 403; source_import_disabled |

Protected status identifies only `NEO_CES_NMNI_PASSWORD` as missing. No unattended CES login or source import has occurred. The runtime control and restricted database credentials were not written into source, this record, or logs.

The operator must add the CES account password directly at https://dashboard.render.com/web/srv-dbhtlv4s728c73cuetf0/env under `NEO_CES_NMNI_PASSWORD`, then save and deploy. Do not send the password through chat. After it is active, perform live member and administrator verification, then execute the already authorized bounded import. No additional import approval is required.

The historical record below describes the earlier credential-free deployment and superseded approval request.

## Verified destination

| Item | Value |
| --- | --- |
| Workspace | NEO SYSTEM |
| Workspace ID | tea-dbhtkc8473hc73933img |
| Service | neo-ces-read-staging |
| Service ID | srv-dbhtlv4s728c73cuetf0 |
| Compute plan | Free |
| Region | Oregon |
| Automatic deployment | Off |
| Source branch | fix/ces-nmni-authentication-proof-20261029 |
| Deployed source commit | 5afbe4596bba8a887a2f12e8ceed80b059aaa1c8 |
| Live deployment | dep-dbhtlvcs728c73cueudg |
| Health | https://neo-ces-read-staging.onrender.com/health |
| Environment | https://dashboard.render.com/web/srv-dbhtlv4s728c73cuetf0/env |

The new workspace was identified in both the Render connector and the operator's browser. It initially contained no services. Creating the dedicated free service succeeded without changing a spending limit or plan. Render reported the deployment live.

## Live verification

- Health returned HTTP 200 with `ok: true`, service `neo-ces-read-runtime`, `database: false`, and the expected deployed source commit.
- The health response was independently retrieved by Firecrawl and a direct Python HTTPS request.
- An unauthenticated request to `/v1/imports` returned HTTP 401 and `{"error":"authentication_required"}`.
- All 89 relevant local tests and all eight GitHub workflows passed for the deployed source commit.
- A query as Neon role `neo_ces_runtime` confirmed zero imported batches.

The database flag is false because this deployment intentionally contains no database credential or runtime control token. Process health does not establish live CES authentication or database readiness.

## Secret-transfer decision

The first service-creation request included the restricted Neon connection and a runtime control token. Automatic approval review rejected it because the sensitive payload and new Render destination lacked explicit authorization. No service was created and no secrets were transferred by that rejected call.

A materially safer second request created the service without credentials, with `NEO_CES_IMPORT_ENABLED=false`. The startup now supports credential-free health verification; all control and import routes remain closed. This second request was accepted and the resulting destination has been verified.

Before provisioning, obtain explicit operator approval to install the restricted Neon connection, runtime control token and NMNI administrator identifier into this named service environment. Credentials must never appear in Git, client-side configuration or this record. The operator must enter the existing CES password directly in Render as `NEO_CES_NMNI_PASSWORD`; no browser password or cookie was exported.

## Remaining authorized execution

1. Provision the approved server configuration in this dedicated service.
2. Obtain the CES password through direct operator entry in Render.
3. Deploy and verify database readiness and the protected runtime status endpoint.
4. Invoke `/v1/auth/check` and require both NMNI member and administrator proof.
5. Enable and execute the previously authorized bounded source import, then query persisted row counts and source hashes.
6. Restore the previous Oracle staging configuration and withdraw its unused CES-specific settings after the dedicated path is fully verified.

The existing Neon source table and restricted role can be reused. Their permissions do not allow access to NEO Bank member or ledger tables. Imported history remains source evidence and is not posted as a member balance or spendable funds.

No unattended CES authentication, source import, financial transaction, V-Dollar issuance or change to production DNS was performed in this gate.
