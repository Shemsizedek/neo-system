# NEO-TERMINAL-001 — OpenTerminal integration assessment and isolation

**Upstream:** [ErTasselli/OpenTerminal](https://github.com/ErTasselli/OpenTerminal)  
**Reviewed upstream main commit:** `aed097c680cd8ec1c391ae06966babe7d6d91fc6`  
**Upstream license:** MIT, © 2026 OpenTerminal contributors. Preserve the upstream copyright and license text in every copied or substantially derived component.

## Decision
**Approved for isolated integration research; not approved for copying the whole stack directly into the current GitHub Pages build or for live trading.**

OpenTerminal is a Next.js 15 + React 19 widget workspace backed by Express + TypeScript, with SQLite portfolio storage, local state, and provider-specific quote/chart/news/crypto/options/macro adapters. NEO's public root uses a Vite React build, while `apps/neo-exchange` is another separately built frontend. The right candidate is **`apps/neo-terminal`**, a separate application with a deployable backend, not an overlay inside `src/explorer/NeoExplorer.tsx`.

## Capability mapping

| OpenTerminal capability | NEO Terminal module | Integration requirement |
| --- | --- | --- |
| Widget workspace and keyboard palette | NEO Terminal workspace | Preserve responsive mobile navigation; user-controlled layouts |
| Charts and technical indicators | NEO Trader market studies | Read-only price history; provenance and freshness on every bar |
| Quotes, screens, options, macro | NEO Prime market intelligence | Entitled provider adapters; no price treated as execution-grade by default |
| Crypto board | NEO DEX / NEOscan | Bitcoin and Counterparty issuance/market data as distinct sources |
| Portfolio tracker | NEO Books / NEOpay | Explicit account authorization, per-user isolation, encrypted persistence |
| Economic calendar and news | NEO Prime | Source attribution, refresh control, licensing check |
| Optional AI assistant | NEO Algo / NEO Prime | No stored provider secrets in public frontend; approval-gated actions |

## Production boundaries

1. **Runtime:** GitHub Pages is a static host; the upstream Next.js server, Express APIs, and SQLite write paths require a separate authenticated backend. No production backend has been deployed by this gate.
2. **Licensing:** MIT permits reuse of OpenTerminal code with the required attribution, **but does not grant third-party market-data redistribution rights**. The upstream explicitly warns many free/public feed sources are only suitable for personal or research use.
3. **Security:** Upstream defaults to `127.0.0.1` and a localhost web origin. A public NEO service requires TLS, explicit allowed origins, identity-bound sessions, rate limits, security review, and server-held secrets; **never include an API key in GitHub Pages**.
4. **Finance:** NEOfx Treasury wallet `18FyntJG9hdXYvanm67mGgbyo1P7adckvg` and Orange Chip™ listing wallet `1Ky2wRYYrJzqdQJH64F7TR98fqLxJs7LK8` are separate issuance domains. Coin/Cash/Share/Note/Bond classifications are internal taxonomy, not automatic legal claims.
5. **Execution:** No wallet signing, order routing, trade placement, issuance, movement of funds, or claims of production price verification from this gate.

## Next implementation gates

- **002:** Create an isolated `apps/neo-terminal` application skeleton, pinned upstream provenance, MIT notice, build/tests, and a non-misleading status-first public route. Prefer a Vite-compatible native shell for GitHub Pages, while keeping any Next.js/Express fork separately deployable.
- **003:** Introduce source-attributed typed market adapters and consent/entitlement checks; use stable NEOscan, NEOChain, NEO DEX, NEOfx, and NEO Prime interfaces.
- **004:** Integrate production auth through NEOpass and persistent per-user layouts; test server/API, mobile UX, and failure modes. Do not claim live operation before deployment checks pass.
- **005:** Add NEO Trader approval-gated transaction preparation; signing/broadcast only under an independently reviewed authorization flow.

## Readiness criteria
- Upstream source pin and MIT notice preserved.
- Dependency inventory, vulnerability scan, Terms of Service and redistribution review complete.
- Local build/test and GitHub Actions CI pass.
- No API keys in browser bundles; public client is read-only.
- Independent staging deployment checks confirm authenticated API and responsive UI.
- Explicit production approval before any trade or financial execution.
