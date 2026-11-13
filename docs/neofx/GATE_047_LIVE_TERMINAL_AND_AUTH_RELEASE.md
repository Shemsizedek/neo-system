# NEO-FX-047 — Real Cloud Run frontend and authentication rollout

## Root cause discovered
The Cloud Run Dockerfile builds `apps/neo-exchange`; it does not build `src/neofx/NeoFxApp.tsx`. The Cloud Run router serves `apps/neo-exchange/dist` via `serveExchange`. Therefore changes only to `src/neofx` cannot repair `neofx.holytemples.org`.

## Implemented in branch
`apps/neo-exchange/src/main.jsx`: working sidebar view selection, market refresh, chart interval selection, explicit unavailable-feature messaging, secure pending state for Alpaca Connect, order review safely blocked. These are UX and honest gating updates, not live account synchronization.

## Deploy gate
1. Run `cd apps/neo-exchange && npm ci || npm install && npm run build` in approved CI; inspect errors and output.
2. Review/merge PR #904 after tests. Confirm the existing Cloud Build trigger for Google Cloud project in us-central1.
3. Build Dockerfile `deploy/neo-edge/Dockerfile`; deploy digest-pinned `neo-edge` Cloud Run revision; verify service and domain mapping.
4. Verify `https://neofx.holytemples.org/` returns React app JS assets (not fallback serviceConsole), `/health` is healthy, `/api/neo-exchange/markets` and `/api/markets/tickers?market=fx` return JSON with source and timestamps. Verify navigation, refresh, data and explicit trading block in browser.
5. Observe errors and compare deployed revision image digest; roll back if errors.

## NEO FX auth portal
Provision private session service backed by NEO Pass identity with protected cookies and CSRF. Do not accept anonymous sessions for broker authorization. Serve a dedicated account portal from `/account` only after backend secure session verifier and trusted account authorization are tested. Create Google Cloud Secret Manager resource for Alpaca OAuth Client Secret and private token vault. Only then expose `/api/integrations/alpaca/oauth/start` and approved `/callback`. The callback currently remains unimplemented and cannot safely be advertised as active. OAuth state must be atomically consumed using durable storage. Paper read-only first; all live orders blocked on server.

## Blockers
- Google Cloud build/deployment admin connection not available in this conversation.
- Secret Manager/client secret provisioning unverified.
- NEO Pass session verifier, durable state storage, vault and callback not deployed.
- No Alpaca OAuth consent or verified paper account retrieval.
