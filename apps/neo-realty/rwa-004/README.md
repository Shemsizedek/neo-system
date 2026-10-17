# NEO-RWA-005 developer sandbox
- UI: `apps/neo-realty/rwa-004/index.html` standalone simulated calculator; not wired to API.
- Backend: `server/neo-realty/api.mjs` authenticated **sandbox-only** JSON event API; file persistence, non-production.
- Start locally: `NEO_REALTY_SANDBOX_TOKEN=choose-a-strong-token node server/neo-realty/api.mjs`
- Test: `node --test server/neo-realty/*.test.mjs`
- POST `/api/rwa/pilots` with JSON `{"usd":75000,"usdPerNomni":1,"ownerStake":20}`.
- GET `/api/rwa/pilots/:id`; POST `/api/rwa/pilots/:id/events` with JSON `{"type":"QUOTE_RECORDED"}`, then PLEDGED, FUNDED, TITLE_REVIEW, RELEASE_BLOCKED, all simulated.
- All requests must provide `Authorization: Bearer <NEO_REALTY_SANDBOX_TOKEN>`.
- Backend intentionally binds 127.0.0.1 only. Never put token in static client. Before remote deployment implement a real SSO/RBAC authenticated backend, transactional datastore, per-case permissions, rate limits, audit log backup and privacy controls. Journal hashes do not constitute independent cryptographic anchoring.
- Freewallet and Counterwallet are reference candidates only: **no live vendor escrow API or wallet integration**. No executed deed, asset title, NOMNI balance, funding, money transmission, insurance, token issuance, or professional escrow occurs here.
