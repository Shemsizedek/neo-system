# Project 144 — Financial product interface separation and shared-rail contract

**Gate:** UI ownership preserved, source-only policy and test implementation. No existing product interface, domain, theme, menu or user flow is changed; no deployment in this gate.

## Canonical user journey

NEO Pay remains the simple wallet/payment entry app. A user may access NEO Bank capabilities in the existing NEO Pay journey or follow the existing link to the separately owned NEO Bank application; neither embeds or replaces the Bank UI. The distinct Counterpay website and plugin surfaces remain independently branded and can power a shared internal Bitcoin/Counterparty payment-request rail. NEO FX retains its own market interface. NEO Counter, NEO Books and eGaaS consume services through approved APIs, not shared frontend components.

| UI product | Known host | Source ownership | Purpose |
|---|---|---|---|
| NEO Pay | `pay.holytemples.org` | `apps/neopay`, `src/neopay` | User-facing wallet, payment flows and approved NEO Bank access |
| Counterpay | `counterpay.holytemples.org` | Candidate `public/neopay` in draft PR #1408; live binding unverified | Separate Counterparty wallet/website/plugins and shared inbound BTC request rail |
| NEO Bank | `neobank.holytemples.org` | `server/neo-bank`, `apps/neo-bank-pages` | CES mutual credit, internal accounts and reconciliation; independent UI |
| NEO FX | `neofx.holytemples.org` | `apps/neo-exchange` | Independent FX and conversion experience |

## Backend-only integration boundaries

Independent NEO Pay / Counterpay / Bank / NEO FX UIs -> authenticated NEO API with NEOpass tenant-specific mandates -> Counterpay request rail -> NEO Bank -> Nibiru Reserve CES/virtual-dollar memorandum postings and reconciliation -> NEO Conversion authorized-liquidity adapters -> NEO Books verified settlement journals.

NeoMask controls eligible signing. Agents and bots may prepare receivables but do not receive unrestricted spending, custody, broadcast, fiat remittance or exchange authority. The `server/neo-financial-interop/fabric.mjs` planner returns **non-executable** scoped operation plans. It makes no API calls or financial entries. Never trust browser-supplied claims of approval. Future server-side adapters must independently enforce subject/organization/workspace, permissions, issuer and provider controls. Reuse existing Gate 128 conversion engine.

## Monetary distinctions

- BTC, XCP and NOMNI blockchain assets are not automatically redeemable for cash.
- CES mutual credits or V-Dollars are not presumed to be USD deposits, legal tender, collateral, reserve assets or guaranteed liabilities. Nibiru records memorandum balances until issuer obligation, backing, redemption and recognition are verified.
- USD/world-currency on/off ramps need a real authorized provider, KYC/AML, sanctions controls, jurisdictional eligibility, verified liquidity and FX pricing. Missing routes fail closed.
- Nibiru ISO 20022 message support is not SWIFT, Fedwire, FedNow, Treasury-window or banking access.
- Personal and team accounts have separate tenant contexts, mandated organization authority and provenance. Never merge balances, payment instruments or private family-office contact records across workspaces.

## Verified repository sources

- `config/neo-ui-production.json` contains distinct NEO Pay, Bank and NEO FX surfaces.
- `src/neopay/NEOpaySurface.tsx` links to the Bank interface rather than importing a Bank UI.
- `docs/neopay/NEOPAY-CANONICAL-SYSTEM-INTEGRATION.md` requires noncustodial user signing.
- `docs/NIBIRU_RESERVE.md` describes durable accounting positions and reconciliation.
- `docs/NEO-G128-MULTI-ASSET-CONVERSION.md` defines conversion authorization and liquidity eligibility.
- PRs #1408, #1409, #1411 and #1412 remain separate review gates.

## Next gates

1. Verify Counterpay Sites source/runtime binding and establish protected staging endpoints.
2. Add a server-only adapter between verified Counterpay payment intents, NEO Bank account references, and Nibiru, preserving tenant identifiers and isolating each UI.
3. Implement durable wallet/address reservations, independent Bitcoin confirmation/reorg verification, and distinct Counterpay receipt (3 confirmations) vs Nibiru memorandum recognition (6 confirmations) policies.
4. Run this gate's CI and existing product browser regression checks; reject unintended UI changes.
5. Verify issuer authority, reserves, provider agreements and applicable banking/payment/FX law before fiat conversion or redemption.

**Deployment:** none. **Funds moved:** none. **Customer UI changes:** none.
