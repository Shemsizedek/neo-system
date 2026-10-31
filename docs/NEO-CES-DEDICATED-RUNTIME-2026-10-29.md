# Dedicated CES runtime — 2026-10-29

This record supersedes the shared-host deployment proposal for the next CES gate.

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
