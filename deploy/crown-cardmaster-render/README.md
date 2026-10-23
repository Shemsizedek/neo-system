# NCC-007: NEO Crown CARDMASTER free Render runtime (staging only)

## Deployment contract

- Repository: `Shemsizedek/neo-system`
- Branch: `feat/ncc-007-render-runtime-hardening` (stacked on NCC-005 / NCC-004)
- Render type: **Node web service, Free plan, auto-deploy OFF**.
- Build command:
  `node --test server/crown-metadata/cardmaster*.test.mjs api/crown/cardmaster.test.mjs deploy/crown-cardmaster-render/*.test.mjs && node scripts/generate-cardmaster-gallery.mjs`
- Start command: `node deploy/crown-cardmaster-render/server.mjs`
- Build environment: `SKIP_INSTALL_DEPS=true`. The runtime uses Node built-ins only; automatic root npm dependency installation is unnecessary.
- Runtime: Node 24 from root `package.json`; binds `0.0.0.0:${PORT}`.
- Do not attach databases, API keys, wallet credentials or paid add-ons.

## Routes

- `GET /` - accessible CARDMASTER preview with 3 example cards and 6 generated SVG faces.
- `GET /healthz` - small read-only health payload; no external network work.
- `GET /api/crown/cardmaster` - JSON metadata and an attributed, fail-closed market view.
- `GET /api/crown/cardmaster?format=svg&card_id=NEO-CARD-000001&face=front` - no-script SVG.
- `GET /art/NEO-CARD-000001-front.svg` - deterministic static SVG.
- `GET /robots.txt` - disallow indexing of staging.
- All wallet, treasury, signing, publishing, payment and mutation routes do not exist; write methods return 405.

## Market evidence standard

Existing `server/markets/ticker-service.mjs` reads upstream market sources and can derive an indicative NOMNI/USD cross-rate from open Counterparty orders and a separate BTC/XCP reference price. Its `generatedAt` is the **service retrieval time**, not proof of the underlying order observation or execution time.

NCC-007 refuses to display a price unless the trusted adapter supplies `source_observed_at` and `source_observation_verified: true` and both the provider observation and retrieval timestamp pass strict freshness checks. **The existing ticker adapter does not currently produce this provenance, so NOMNI pricing correctly remains unavailable until the source-verification adapter is implemented and tested.** It is not acceptable to populate the flag with guessed or copied current timestamps.

Private capital and real estate card values, statuses, ROI targets and issuer labels remain unverified operator-submitted claims; they are not market data, audited financials, offering approvals or reserve attestations. SVG artwork has no transaction or NFT effect.

## Safety measures

- Generated gallery and same-origin read-only API are served by a single Free Node service.
- Static paths and card IDs are allowlisted; filesystem paths never derive from arbitrary user input.
- HTML/SVG script restrictions, no inline app styles, `noindex`, `nosniff`, restrictive CSP and framing controls.
- At most two live JSON API requests in flight and a short API snapshot cache. No autonomous polling.
- Allowed CORS origins are pinned; the built-in gallery uses the same origin.
- A provider failure returns no price, not an inferred valuation.
- No user data, secrets, market promises, wallet operations, contract changes or irreversible actions.

## Validation

From repository root:

    node --test server/crown-metadata/cardmaster*.test.mjs api/crown/cardmaster.test.mjs deploy/crown-cardmaster-render/*.test.mjs
    node scripts/generate-cardmaster-gallery.mjs
    node --check deploy/crown-cardmaster-render/server.mjs

After staging deployment, independently check the public URL and route responses, visually inspect all cards and metadata, and verify actual upstream ticker behavior before reporting full end-to-end readiness. CI success does not equal a complete browser smoke test.

## Dependency advisory

A prior NCC-006 Render build reported **7 npm audit findings (3 moderate, 3 high, 1 critical)** from installing the root monorepo dependencies. This new dedicated service requires no third-party runtime packages; `SKIP_INSTALL_DEPS=true` avoids installing unrelated root dependencies during its build. This **does not fix** the monorepo's outstanding dependency advisories. Those require a separately reviewed lockfile and application impact audit.

## Free-plan guardrails and rollback

Render Free web instances can spin down after idle time and have workspace-wide free instance-hour limits. Included pipeline and bandwidth overages can be billable when a payment method is configured. Disable auto-deploy, keep refresh user-triggered, check dashboard usage/spend controls, and do not enable paid upgrades without authorization.

Keep `neo-crown-cardmaster-staging` (the older static NCC-006 preview) intact as a fallback. To roll back the new runtime, disable its service or deploy a prior reviewed commit; it does not modify the existing static site or NEO Core.

## Pending to advance

- Confirm live Render service health, HTML, SVG, API and browser behavior.
- Reconcile broader CI inventory failures and the monorepo security-advisory backlog separately.
- Add independently verified Counterparty market-observation times to the source adapter.
- Review rights/claims, source records and legal/compliance implications before public investment promotion.
