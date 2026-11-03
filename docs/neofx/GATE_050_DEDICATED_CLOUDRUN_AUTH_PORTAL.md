# NEO-FX-050 — Dedicated Cloud Run staging and account portal

## Implemented
- `server/neofx/dedicated.mjs` — separate HTTP app serving the actual React dist; read-only market APIs, health, and fail-closed broker/private auth paths. Public order mutation requests return 405; no brokerage credentials accepted.
- `deploy/neofx/Dockerfile` — builds `apps/neo-exchange`, bundles required Counterparty and market read-only services; does not boot shared `neo-edge`.
- `cloudbuild.neofx.yaml` — image build/push and deploy **neofx-staging** on Cloud Run in us-central1 with authentication required; does NOT create or replace domain mappings.
- `apps/neo-exchange/src/main.jsx` — explicit `/account` portal shell with pending auth state, no collection of credentials.
- `server/neofx/dedicated.test.mjs` — localhost tests for health, OAuth denial, account denial, no order writes, ticker reads, asset path protections.

## Release gates
1. Run `node --test server/neofx/*.test.mjs`, then `cd apps/neo-exchange && npm install && npm run build`. No proof CI has passed yet.
2. Build/test dedicated image and exercise `/health`, `/account`, `/api/markets/tickers?market=fx`, `/api/neo-exchange/markets` with Cloud Run authenticated invoke permission.
3. Set up GCP service account (least privilege), private Firestore durable atomic OAuth state and encrypted token vault, and Secret Manager. Credentials must be inserted by a trusted operator in GCP, never via public GitHub.
4. Implement NEO Pass-backed session validation, secure SameSite HttpOnly cookies, CSRF, rate limiting, issuer checks and host validation before enabling OAuth start/callback; confirm approved Alpaca scopes/environment against current official documentation.
5. Verify Alpaca paper consent, an authorized read-only account response and encrypted revocable token storage using staging app. No real-money orders.
6. Only after regression evidence, explicitly migrate the `neofx.holytemples.org` mapping from shared edge to dedicated `neofx` service; retain rollback route and verify unrelated NEO subdomains.
7. Run end-to-end on public HTTPS via independent operator; record Cloud Run revision, Artifact Registry digest, responses, session success and redacted account response.

## Caveats
- GCP project access and deployment execution were unavailable in this session; source commit is not a deployment.
- No Alpaca OAuth tokens, API account access or live portfolio verified.
- `/account` is a visual status portal, not a functional sign-in yet. OAuth routes intentionally return 503.
- Previous CI preflight checks apply to shared edge only; dedicated tests now included in glob `server/neofx/*.test.mjs`.
