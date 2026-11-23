# NEO-FX-045 — Alpaca Connect activation and Google Cloud handoff

App name: NEO. Public website: https://neofx.holytemples.org
User-confirmed approved callback: https://neofx.holytemples.org/api/integrations/alpaca/oauth/callback
Status: redirect URL USER-CONFIRMED, developer credentials NOT provisioned in GCP, application OAuth grant NOT completed, Cloud Run callback NOT deployed, execution OFF.

## Server-side secret provisioning (operators only)
- In the owning GCP project use Secret Manager, e.g. `NEOFX_ALPACA_OAUTH_CLIENT_SECRET`. Never place secret in chat, GitHub, frontend or build substitutions.
- Put public `NEOFX_ALPACA_OAUTH_CLIENT_ID` in authenticated backend environment; prefer a protected runtime configuration.
- Bind production Cloud Run service identity to the single relevant secret version, not broad project secrets.
- For the OAuth state store, implement transactional create and consume once, per NEO Pass session, TTL <= 5 minutes; the adapter's injected `saveState/takeState` are not implementations.
- Encrypt OAuth tokens with KMS-managed data keys; scope to tenant, broker, environment, session and trustee. Restrict retrieval to private service.
- Expose `/api/integrations/alpaca/oauth/callback` only after provisioning an authenticated session flow; do not put a raw OAuth callback on the public unauthenticated gateway.
- Validate Alpaca OAuth official product permissions and production URLs inside the approved developer portal before making token requests.
- OAuth authorization is external user consent; never automate login/credential entry.
- Prevent any order mutations at ingress and broker adapter. `NEO_FX_LIVE_TRADING=false`.
- The current adapter makes a paper-account GET request and is a foundation, not deployed OAuth wiring. Verify actual OAuth bearer-token eligibility for the target paper endpoint against Alpaca's docs.
- Local unit tests: `node --test server/neofx/alpaca-oauth.test.mjs`. Run as part of CI. Unit tests use stubbed HTTP responses, not real Alpaca.
- Confirm frontend displays account data only after verified private backend session and provider approval. No customer onboarding or trading claims prior to consent and broker checks.

## Release acceptance
[ ] Approved Alpaca app and precise OAuth permissions confirmed
[ ] Secret Manager populated securely by owner
[ ] GCP Cloud Run service identity and auth configured
[ ] Durable OAuth state, token store and audit installed
[ ] Callback route wired, authenticated and security-tested
[ ] Trustee/account owner authorizes app through official Alpaca consent flow
[ ] Broker paper-account GET succeeds and is reconciled
[ ] All real-money execution routes blocked at the backend

Rollback: disable OAuth start, revoke credentials and remove callback route, maintain audit records. Never print private tokens.
