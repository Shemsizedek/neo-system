# Modern Treasury connection — Project 144

The first connection verifies NEO's credentials and reads sandbox account identifiers through the NEO Merchant Treasury service. It cannot create accounts, counterparties, payment orders, transfers, refunds or ledger credits at Modern Treasury. Existing merchant settlement logic is separate and unchanged.

## Current evidence and project register

Reviewed on October 29, 2026. Accountable owner: NEOsync. Implementation workstream: NEO Core / NEO Counter merchant treasury.

| Item | Evidence / state |
| --- | --- |
| Repository | `Shemsizedek/neo-system`, base commit `0a04327ef9ab8a1a25a2e21bbcf7c36aa55b5ad2` |
| Integration host in source | Existing `server/neo-merchant-treasury/server.mjs` |
| Account UI | Signed-in dashboard access verified; the application explicitly displays **Viewing sandbox** |
| Source implementation | Sandbox connector, shared operator-only HTTP routes, isolated staging host, CLI and automated tests |
| Credentials | Dedicated read-only sandbox key form prepared; final creation, server storage and authenticated verification remain pending |
| Runtime | Dedicated Render service creation rejected: workspace is at its 25-service limit. Existing Counter staging API is healthy; shared-host deployment is prepared and awaits approval |
| Money movement | Disabled in this connector |
| Next milestone | Verify the sandbox key and account-discovery route on the selected existing staging runtime |

Source implementation and mock tests are not proof of an operational account connection. The [architecture inventory entry](../../architecture/modern-treasury-integration.json) records these boundaries in machine-readable form.

## Connection checklist

- [x] Verify repository access and inspect the existing merchant treasury service.
- [x] Read the current official authentication, permissions, accounts and pagination references.
- [x] Implement server-side credentials, a fixed HTTPS upstream, GET-only operations, redacted errors and bounded responses.
- [x] Require operator authentication before integration status, verification or account discovery.
- [x] Reject production, archived, foreign-organization and overprivileged keys.
- [x] Test the connector, HTTP authorization, pagination and failure cases with synthetic data.
- [x] Verify signed-in sandbox dashboard access after the owner completes sign-in.
- [ ] Owner creates the restricted sandbox key and provisions it in the selected runtime's secret manager.
- [x] Inspect the NEO Render workspace and verify existing Counter staging health.
- [ ] Approve reuse/redeployment of Counter staging, including its temporary test database lifecycle, and provision its separate treasury operator token.
- [ ] Run the authenticated probe against Modern Treasury.
- [ ] Deploy the reviewed change and verify unauthorized requests fail, then check account discovery with the operator token.
- [ ] Record the deployment revision and sanitized probe result before reporting the connection operational.

## Credentials and permissions

Modern Treasury authenticates using HTTP Basic authentication: the Organization ID is the username and the API key is the password. The API origin is the same for sandbox and production; the key determines the environment. This connector checks `/api/api_keys/current` and requires `live_mode` to be the boolean `false` before making the ping or account request.

After completing verification, open the [Modern Treasury API Keys page](https://app.moderntreasury.com/developers/api_keys). The proposed dedicated **sandbox** key is named **NEO Project 144 Staging Read Only**, with **Internal Accounts → View** only and no role selected. The current UI does not offer an API-key/developer resource in its custom-permission selector. Verify key introspection using this minimal key before considering any additional permission; do not select the **API Manage All** role. The connector validates the authenticated key's documented read roles before requesting account data; an account-scoped `accounts:read:<account-id>` role is also accepted. Validate the exact returned permission representation during activation and fail closed if it cannot be verified. Default keys with manage permissions are rejected.

Provision these variables through the existing staging runtime's secret manager:

| Variable | Purpose |
| --- | --- |
| `MODERN_TREASURY_ORGANIZATION_ID` | Organization ID copied from the API Keys page |
| `MODERN_TREASURY_API_KEY` | Dedicated restricted sandbox secret |
| `MODERN_TREASURY_ENVIRONMENT` | `sandbox`; other values are rejected |
| `NEO_MERCHANT_TREASURY_OPERATOR_TOKEN` | Existing treasury operator credential protecting the NEO HTTP endpoints |

Do not paste API keys into chat, commit them, add them to `VITE_` variables, or put them in URLs. Organization IDs are also omitted from this connector's output. Do not broaden access to fix a failing permission check; inspect the key's configuration in the dashboard.

## Verification and HTTP contract

With the variables securely injected into the server process:

```sh
node scripts/check-modern-treasury.mjs
node scripts/check-modern-treasury.mjs --accounts
```

The first command verifies the key and ping. The optional `--accounts` returns one sanitized page, its next cursor and an explicit completion flag. It does not retrieve all accounts or account balances. Failures exit nonzero and print only a stable error code.

| Method / endpoint | Behavior |
| --- | --- |
| `GET /v1/integrations/modern-treasury/status` | Local configuration and last check state; makes no upstream call |
| `GET /v1/integrations/modern-treasury/check` | Authenticated key introspection and ping |
| `GET /v1/integrations/modern-treasury/internal-accounts` | Re-verifies key, then returns only sandbox account `id`, `currency`, `live_mode` |

All three endpoints require `Authorization: Bearer <NEO_MERCHANT_TREASURY_OPERATOR_TOKEN>` and return `Cache-Control: no-store`. No credentials or provider account data are added to the public health or treasury snapshot endpoints.

Account discovery accepts only `per_page` (integer 1–100; default 25), `after_cursor` and optional uppercase `currency`. Duplicate and unsupported parameters fail. Continue with `pagination.next_after_cursor` until it is `null`. Modern Treasury may return short, empty or oversized pages; page length does not indicate completion.

The `verified` state means the last key check succeeded, with its timestamp recorded in `last_verified_at`. It is not a continuous health guarantee. A subsequent failed upstream check changes the state to `verification_failed` while preserving that historical timestamp. Account numbers, routing numbers, legal names, addresses, account names, metadata and raw provider errors are excluded.

## Validation and deployment

```sh
npm run neo-merchant-treasury:test
node --check server/neo-merchant-treasury/modern-treasury.mjs
node --check server/neo-merchant-treasury/server.mjs
node --check scripts/check-modern-treasury.mjs
```

The existing Gate 127 workflow runs the merchant treasury test suite for this integration. Tests use synthetic credentials and mocked HTTP responses; they do not contact Modern Treasury. The existing Dockerfile copies the entire merchant treasury directory, so it includes the adapter without adding dependencies.

Local validation on October 29, 2026: dependency installation and production build succeeded; the merchant treasury suite passed 24 tests; the repository-wide suite passed 878 tests with one skipped and no failures. An authenticated Modern Treasury probe has not been run.

The next gate adds a shared HTTP handler, an isolated staging host, and a wrapper that can host the sandbox connector alongside the existing Counter staging API. All 32 merchant treasury tests and all 11 Counter backend tests pass. Tests cover missing/wrong operator credentials, separation of merchant and treasury credentials, preservation of Counter routes, GET-only treasury access, and sanitized exceptions.

### Render staging decision and reviewed configuration

The verified NEO Render workspace has no existing merchant treasury runtime. Creation of a dedicated free `neo-modern-treasury-staging` service was rejected with **Hobby Tier is limited to 25 services**. No service was created and no workspace upgrade or service deletion was performed.

The prepared alternative uses the existing **neo-counter-render-staging** service (`srv-dbe0o0ff3r2c73cb01mg`) on its existing free plan in Virginia. Its public `/health` returned 200 with service `neo-counter-backend`. Its current live deploy is `dep-dbe0o0vf3r2c73cb02vg` from commit `6bd196caf0afa033b2ef799d9f3958e5a558333f`. This service has automatic deploys disabled and currently tracks `main`.

The wrapper preserves Counter's original handlers, URLs, merchant session authorization and database configuration. Treasury reads use the separate `NEO_MERCHANT_TREASURY_OPERATOR_TOKEN`; a merchant session cannot read treasury accounts, and the treasury token cannot authenticate a Counter session. The isolated-host entrypoint remains available for future capacity, without adding a service now.

Source comparison verified that `server.mjs`, `store.mjs`, and `auth.mjs` in `server/neo-counter-backend` match the current live Counter commit. Those files are unchanged by this integration.

The existing Counter start command places its SQLite database in `/tmp/neo-counter-render/neo-counter.sqlite`. A redeploy may reset that temporary test database. Deployment to this existing service is held for explicit owner approval; do not assume test data is disposable.

| Setting | Current / rollback reference | Proposed value after approval |
| --- | --- | --- |
| Branch | `main` | `feat/project144-modern-treasury-sandbox` |
| Auto deploy | Off | Off |
| Build command | Firestore context and REST DB tests plus Counter server syntax check | Original checks plus merchant treasury tests and wrapper syntax check |
| Start command | `mkdir -p /tmp/neo-counter-render && NEO_COUNTER_DB_PATH=/tmp/neo-counter-render/neo-counter.sqlite NEO_COUNTER_PORT=${PORT:-10000} node server/neo-counter-backend/server.mjs` | Same directory, DB path and port setup, with `node deploy/modern-treasury-render/counter-staging.mjs` as the entrypoint |

```sh
# Proposed complete build command
node --test server/neo-counter-backend/firestore-context.test.mjs server/neo-counter-backend/firestore-rest-db.test.mjs && node --check server/neo-counter-backend/server.mjs && node --test server/neo-merchant-treasury/*.test.mjs && node --check deploy/modern-treasury-render/counter-staging.mjs
# Proposed complete start command
mkdir -p /tmp/neo-counter-render && NEO_COUNTER_DB_PATH=/tmp/neo-counter-render/neo-counter.sqlite NEO_COUNTER_PORT=${PORT:-10000} node deploy/modern-treasury-render/counter-staging.mjs
```

The shared host preserves `/health` and adds `/health/modern-treasury`, plus the three operator-only read endpoints above. It does not expose the merchant treasury service's legacy payout, credit, refund or settlement endpoints. The new health response discloses only service identity, sandbox/read-only flags and a nonsecret source revision. With no treasury operator token configured, all treasury integration routes return 401 and no provider request occurs.

Nonsecret connector configuration is `MODERN_TREASURY_ENVIRONMENT=sandbox` and `NEO_TREASURY_REVISION=<deployed source commit>`. Preserve all existing Counter environment variables and its supported Node configuration. Credentials remain absent until the dedicated restricted key and target storage are approved. Record the actual new deploy ID and source revision, verify both health endpoints, verify missing/wrong credentials fail, and then verify the authenticated key and account page before reporting the connection operational.

The free Render host is for sandbox verification. It can spin down after idle periods and uses the workspace's shared free-instance hours and included build/bandwidth allowances. It is not a 24/7 production payment service. No plan upgrade, paid datastore, production DNS change, or new Modern Treasury financial account is included.

Repository CI observations from the initial feature-branch run: Gate 127 passed. Gates 104, 107 and 108 ran the existing router tests without installing dependencies and failed to resolve `@composio/core`. Gate 131 imported the missing `riskReview` export from the existing risk fabric. Those workflow and module files match the base commit and are outside this integration's implementation. Track their repair in the repository maintenance backlog; do not describe the initial full workflow run as green.

The repository currently contains a production Cloud Run deployment workflow for the merchant treasury service, binding only its operator-token secret. That is source evidence, not verification of a running service or its secret configuration. Confirm an existing staging target and explicitly bind both Modern Treasury variables there; do not invoke the production workflow as a staging deployment. Do not assume Render hosts this service, create paid resources or repoint production DNS for this connection.

For activation: retain the previous runtime revision, provision the restricted sandbox secret, deploy the reviewed revision, verify `/health`, confirm integration endpoints return 401 without an operator credential, then run `/check` and the account discovery route with the operator credential. Save only sanitized results with the revision. On failure, remove the new Modern Treasury credentials from the runtime and roll back to the previous revision; do not rotate or delete unrelated credentials. Account access remains disabled without the operator token.

## Decisions and prioritized backlog

| Priority | Decision / remaining work | Owner / dependency |
| --- | --- | --- |
| Complete | Verify signed-in sandbox dashboard access | NEOsync / Modern Treasury |
| P0 | Use a dedicated restricted sandbox key; verify the key's actual mode and organization | NEOsync / existing secret manager |
| Approval required | Reuse/redeploy Counter staging; its temporary SQLite test data may reset | NEOsync / reviewed configuration above |
| P1 | Deploy and verify operator-only account discovery on the approved staging host | NEO Core operations / P0 and staging reuse approval |
| P1 | Repair existing router CI dependency installation and missing risk-fabric export identified during validation | NEO Core repository maintenance / independent of account activation |
| P1 | Map verified internal account IDs to NEO treasury records with explicit currency and reconciliation rules | NEO Counter treasury / verified sandbox accounts |
| P2 | Add signed webhooks with raw-body HMAC verification and durable deduplication before relying on events | NEO Core / durable event store and reviewed endpoint |
| Separate approval | Production read access or money movement requires a separately reviewed scope, provider eligibility, permissions and payment controls | NEOsync / legal and compliance validation at the provider interface |

No webhook receiver, bank-account creation or payment execution is included in this gate. Modern Treasury's documentation describes its own provider services; this source integration does not establish NEO's eligibility or activate those services.

## Official references

- [Payments overview](https://docs.moderntreasury.com/payments/docs/overview)
- [Payments quickstart](https://docs.moderntreasury.com/payments/docs/quickstart)
- [Authentication](https://docs.moderntreasury.com/platform/reference/authentication)
- [API key object and roles](https://docs.moderntreasury.com/platform/reference/api-keys)
- [API key permissions](https://docs.moderntreasury.com/platform/docs/api-key-permissions)
- [Sandbox behavior](https://docs.moderntreasury.com/payments/docs/payments-sandbox-overview)
- [Internal account object](https://docs.moderntreasury.com/platform/reference/internal-account-object)
- [List internal accounts](https://docs.moderntreasury.com/platform/reference/list-internal-accounts)
- [Pagination](https://docs.moderntreasury.com/platform/reference/pagination)
- [Webhooks](https://docs.moderntreasury.com/platform/reference/webhooks)
- [Render free service limits](https://render.com/docs/free)
