# CES staging activation preflight — Project 144 (2026-10-30)

## Verification to date

- Dedicated Render service: `neo-ces-read-staging`, ID `srv-dbhtlv4s728c73cuetf0`, NEO SYSTEM workspace `tea-dbhtkc8473hc73933img`, auto-deploy disabled; latest deploy `dep-dbhtlvcs728c73cueudg` is marked live.
- The public health and import endpoints returned transient HTTP **503** during this gate. Do **not** assert current availability until a new 200 JSON health response is obtained. The free service may need to wake from idle; a live deployment indicator is not a passing application-health test.
- Existing Neon staging database `neobank_staging`, role `neo_ces_runtime`: SELECT/INSERT allowed on `neo_ces_source_imports`, UPDATE denied, no SELECT of NEO Bank accounts and no INSERT into NEO Bank entries; source table contains **0** rows as observed.
- A prior automatic cross-connector secret transfer was blocked by a security control. Do not bypass that control, print a connection string, or copy passwords into GitHub. The restricted database URL / runtime bearer token have **not** been verified inside this dedicated service.

## Secret provisioning — operator-controlled

Open the [dedicated Render Environment page](https://dashboard.render.com/web/srv-dbhtlv4s728c73cuetf0/env). Enter sensitive values through its protected UI, not a PR, issue, log, chat message or command history.

| Variable | Role | Gate |
| --- | --- | --- |
| `CES_SOURCE_DATABASE_URL` | Restricted Neon `neobank_staging` URL for **neo_ces_runtime**, TLS required | Required for source-store access |
| `NEO_CES_RUNTIME_TOKEN` | New cryptographically secure 32+ byte random secret, separate from CES and banking credentials | Required for protected status/read endpoints |
| `NEO_CES_NMNI_USERNAME` | Dedicated approved NMNI login identity, read-only role where available | Required for CES auth |
| `NEO_CES_NMNI_PASSWORD` | Current approved NMNI password; rotate old URL-exposed credentials first | Required for CES auth |
| `NEO_CES_IMPORT_ENABLED` | `false` during initial activation; only change after verification | Fail-closed |

**Do not substitute** the NEO Bank database owner URL, the CES legacy password-bearing URL, Modern Treasury credentials, or NEO Core secrets. Updating the environment may trigger deployment; check the Render build status and budget/quota before saving. No spending or production changes are authorized by this procedure.

## GET-only verification

Run from an authorized operator environment with Node 24:

```sh
node deploy/ces-read-runtime/staging-preflight.mjs
```

This performs only `GET /health` and unauthenticated `GET /v1/imports`, with manual redirects and no cookies. It emits a **sanitized** result; passing means HTTP 200 with the expected service contract, and HTTP 401 when not authenticated. The result does not prove CES administrator access.

Once the operator has securely installed a distinct runtime token, it may be supplied to that command through the environment (without printing its value). This also uses only `GET /v1/status` and checks `databaseConfigured`, `credentialsConfigured` and `financialWritesEnabled=false`; it does not log the token, copy any bank data or call login/collect endpoints.

**Do not call** `POST /v1/auth/check` until separately authenticated CES credentials and protected control-token access are confirmed. Source import remains off until administrator proof and the schema review. Only then may the separately approved, narrowly bounded `POST /v1/collect-import` be considered.

## Acceptance checklist

- [ ] Protected secrets entered in dedicated Render environment without disclosing values.
- [ ] Render service deploy succeeds; `GET /health` returns 200, expected service and `database:true`.
- [ ] Unauthenticated `GET /v1/imports` returns 401 (not 200).
- [ ] Scoped control token can read `GET /v1/status` and reports `financialWritesEnabled:false`; CES credentials show present only, not proof of login.
- [ ] Separate, explicitly authorized NMNI login/auth proof succeeds without exposing cookies.
- [ ] Source import toggled only after authentication and private schema checks.
- [ ] One bounded import produces a SHA-256 source reference, and its row count/time match the CES report.
- [ ] NEO Bank ledgers, transfer controls, NOMNI supply and V-Dollar issuance remain unchanged.

Related: [PR #1273](https://github.com/Shemsizedek/neo-system/pull/1273) (CES runtime), [PR #1278](https://github.com/Shemsizedek/neo-system/pull/1278) (restricted metadata consumer), [Security Issue #1274](https://github.com/Shemsizedek/neo-system/issues/1274).
