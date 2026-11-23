# NEO-FX-053 — Render–Neon link and NEO Pass authorization release gate

## Confirmed infrastructure
- Render service: neo-fx-paper-staging, NEO SYSTEM workspace, branch feat/neofx-global-multibroker-028, no automatic Git deployment.
- Neon: isolated project neo-fx-oauth-staging, database neofx.
- Migration: neofx_auth.oauth_state and neofx_auth.broker_tokens are applied on Neon main.
- Dedicated PostgreSQL role: neofx_staging_runtime; grants USAGE on neofx_auth and SELECT/INSERT/UPDATE on the two tables only.
- Private NEOFX_DATABASE_URL is configured in Render via its secret environment-variable settings, never committed in Git.
- New source: neon-staging-client.mjs, neon-oauth-store.mjs and their tests.
- Render's latest observed deployment status was live. This does not prove runtime database connectivity.

## Runtime blockers
- The new pg dependency is declared in server/neofx/package.json; **existing Render build command does not install it**. Update build command to include `npm install --prefix server/neofx --no-audit --no-fund` before enabling the Neon client.
- Backend must actually instantiate the Neon pool and verify the schema in authenticated startup/diagnostic tests; no private DB diagnostic exposed publicly.
- Existing NEO Pass verifier contract can validate signatures and claims only when a vetted issuer, audience, JWK trust roots, and revocation lookup are configured. These are not provisioned for NEO FX. Do not trust a browser-supplied identity or pass through arbitrary username/email.
- Proper session cookies, CSRF defense and verified tenant grants must precede any OAuth start or callback routes.
- Alpaca OAuth client secret and independent vault AES-256-GCM key are not configured in Render. Provision via Render secret environment settings or approved secure secrets provider, never chat/GitHub.
- Client ID alone is not authentication. OAuth callback is intentionally 503 until authoritative identity and storage work.
- The public domain neofx.holytemples.org has not been moved to Render and no production order execution is enabled.

## Acceptance
1. Build all NEO FX tests passing including new database and auth tests.
2. Set up Render runtime pg install and verify Neon query with restricted role, TLS, and no secret disclosure.
3. Configure NEO Pass authoritative verification with active revocation checks.
4. Configure secure OAuth session, CSRF, nonce/state and encrypted token vault.
5. Activate Alpaca paper-only consent and verify GET /v2/account only after real user approves.
6. Record results, timestamps, broker account provenance, deployment revisions; only then consider public domain cutover.
