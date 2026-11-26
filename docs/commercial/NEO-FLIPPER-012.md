# NEO-FLIP-012 — Staging activation attempt (2026-11-21)

**Principal:** Shelton Estate & Co. / NEO Deal Desk. **Intent:** activate a synthetic-only, zero-cost health-check staging service. **Result:** code and tests committed, **deployment blocked by Render billing status**.

## What was committed
- `server/neo-flipper/staging/gate12-health-server.mjs`: a fail-closed public-health-only staging shell. It mounts **only** `GET /healthz`; buyer, listing, audit, deal preview, signing, payment and transfer routes are not exposed. A test-only private smoke routine may mark health ready only after verified scratch-only PostgreSQL persistence with zero recognized revenue. Errors keep readiness blocked.
- `server/neo-flipper/staging/gate12-health-server.test.mjs`: health fail-closed, ready status, rejection of public business routes, lack of database credential, invalid smoke evidence, and strictly synthetic success.
- Dedicated Flipper GitHub Actions test workflow passed on commit `7239276c6b8d6838c47fdb9f1a44366687cf1dd3`, run `44896254830`. Syntax validation and complete Flipper test suite both passed.

## Deployment attempt and verified blocker
Render workspace `tea-db8bbpij9qps73cb7gb0`, link `link_6ad90803ed5881918d1bd53e5e4c014a`.

Existing `neo-deal-desk` free-plan service `srv-db9543eq1p3s73csefu0` was confirmed `suspended` for `billing`. No changes were made to it.

Attempted creation of **a separate free-plan service** `neo-flipper-staging-health`, on branch `feat/neo-flipper-001-contract-matching`, `autoDeploy=no`, build syntax and staging tests, startup `node server/neo-flipper/staging/gate12-health-server.mjs`, only non-secret env var `NEO_FLIPPER_MODE=synthetic_scratch_only`. Render rejected the request with HTTP `402 billing_suspended`.

**No new service ID or deployment URL was returned; activation was NOT successful.** Do not mark staging ready, publicly operational, or receiving deals. No spending or billing changes authorized.

## Security and operational limits
- The public health-only shell intentionally does not expose business transactions.
- Real NEOpass issuer, secure key custody, independently trusted membership/revocation, provider-backed buyers/MLS/comps and actual HTTP-to-Neon test under restricted role are not verified.
- Gate 11's manually runnable HTTP-to-Neon smoke is prepared but not run using a real securely injected connection string; it does not ship credentials or an actual issuer.
- Gate 9 restricted scratch Neon SQL authentication and synthetic transaction were separately verified, as was Gate 10 loopback HTTP with fake store.
- Draft PR #1443 is still unmerged; no production change, external outreach, signature, funds movement, or income recognition.

## Next gate
**NEO-FLIP-013**: resolve Render billing suspension through authorized account administration or use a verified eligible zero-cost host after approval. Then deploy a private staging-only health shell, verify actual deployment identity and test its `/healthz` response. Only after secure provider authentication and database credentials are available should the isolated HTTP-to-Neon synthetic runner execute. Do not activate live business workflows before Texas legal/disclosure review and provider attestations.
