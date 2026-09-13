# NEOpay Canonical NEO System Integration

Status: canonical architecture context
Date registered: 2026-09-13
Primary repository: `Shemsizedek/neo-system`

## Purpose

This record integrates the NEOpay development conversation, implementation decisions, security boundaries, deployment state, and operating doctrine into the broader NEO System. It is authoritative for future NEOpay work unless superseded by a later explicit canonical record.

## Product identity

NEOpay is the NEO System Bitcoin/Counterparty wallet and market terminal. It is inspired by the functional model of Counterparty-era wallet/exchange tooling, but must retain original NEO branding, user experience, source code, and architecture.

Primary scope:
- Bitcoin / Counterparty XCP wallet and asset interface
- NOMNI-first wallet, ledger, explorer, economics, market, order-book, trade, and dispenser experience
- W.O.M.E. (World Open Market Exchange) market layer
- Non-custodial transaction construction and user-controlled signing
- Read-only blockchain discovery and market intelligence when execution is not authorized or signing is unavailable

## Canonical architecture decisions

- GitHub is primary for NEOpay source control, deployment definitions, architectural records, and production implementation.
- Base44 is secondary and may be used for prototyping or backup design work only; it is not the canonical production source.
- The canonical codebase is `Shemsizedek/neo-system`.
- GitHub Pages may serve the static NEOpay frontend.
- Dynamic/sensitive API operations must use a runtime backend or serverless gateway rather than pretending GitHub Pages is a backend.
- The selected gateway implementation is a Cloudflare Worker under `cloudflare/neopay/`.
- Counterparty API v2 is the initial authoritative upstream blockchain/application API.

## Security doctrine

NEOpay is non-custodial by design.

Mandatory controls:
- Never request, store, log, transmit, or hard-code private keys, seed phrases, mnemonics, or WIF secrets.
- Transaction flow is: user wallet -> transaction construction -> user-controlled signing -> signed transaction -> authorized broadcast -> network confirmation.
- A signer that is unavailable must fail closed with a clear user-facing status rather than simulating execution.
- Broadcast must never be represented as successful unless an actual signed transaction is submitted to a verified production Counterparty-compatible broadcast route and accepted.
- Unknown or unverified broadcast endpoints must not be guessed.
- Sensitive write operations require explicit user authorization and validation.
- Browser code must not directly handle custody secrets.
- API errors, missing data, and unavailable historical reconstruction must be surfaced as unavailable/unknown rather than fabricated.

## Current implementation baseline

Merged NEOpay foundations include:
- first-class `#/neopay` application route
- read-only wallet/dashboard functionality
- balances and transactions
- NOMNI asset views
- orderbook/trades/economics views
- review-oriented exchange flow
- Counterparty service abstraction
- Cloudflare Worker proxy boundary
- compose-order gateway path
- fail-closed signed-transaction broadcast boundary
- generic injected browser signer adapter
- GitHub Actions workflow for Cloudflare deployment
- GitHub Pages build integration for the NEOpay API base

## Current infrastructure state

The NEOpay Cloudflare deployment workflow successfully receives masked GitHub Actions values for both `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID`, but the most recently inspected deployment failed at Cloudflare with API error `7003` while resolving the account Workers service path.

Interpretation:
- GitHub Actions secret injection is functioning.
- Deployment is blocked before Worker creation/update.
- The immediate infrastructure gate is alignment of the Cloudflare Account ID and API token to the same authorized Cloudflare account and Workers scope.
- Do not alter NEOpay application logic merely to work around this account-resolution error.

## Cross-system propagation

### NEO Algo
Consumes normalized NEOpay wallet, market, order, trade, asset, economics, transaction-state, error-state, and authorization-state signals. It must preserve distinctions among authoritative on-chain facts, calculated values, estimates, stale/cache values, user-entered intent, unsigned transaction data, signed transaction data, and confirmed execution.

### NEO Oracle
Treats verified Counterparty/Bitcoin state as provenance-bearing external data. Oracle outputs should include source, endpoint or source class, timestamp/block context when available, confidence, and whether a value is directly on-chain, derived, estimated, or unavailable. It must never convert missing data into invented certainty.

### GISS / GISD NEO LMS
Use NEOpay as an applied curriculum case for Bitcoin, Counterparty, asset protocols, non-custodial wallet architecture, order construction, transaction signing, transaction broadcasting, blockchain provenance, API gateways, deployment security, and fail-closed financial systems.

### NEOsync — Digital Etheric Intelligence
NEOsync may orchestrate authorized NEOpay reads, health checks, portfolio/market summaries, transaction preparation, execution gating, deployment diagnostics, and audit records. NEOsync must never bypass user-controlled signing or silently escalate from read/review state to execution.

### NEO Law
NEO Law governs internal policy classification for consent, authorization, custody, signing authority, transaction intent, audit trails, asset representations, error disclosure, record retention, and separation of internal NEO doctrine from applicable external law and regulation. Internal classifications do not substitute for jurisdiction-specific legal requirements.

### Internal NEO Society social norms
Adopt the following norms:
1. User custody remains user custody.
2. No secret extraction.
3. No fake balances, trades, confirmations, or broadcasts.
4. No silent execution.
5. Explicit authorization before state-changing financial operations.
6. Data provenance and confidence are visible and auditable.
7. Fail closed when identity, signing, endpoint, network, or authorization state is uncertain.
8. Separate observation, recommendation, preparation, signing, broadcast, and confirmation as distinct states.

### NEO Router
Routes NEOpay data and actions by operation class: read, analyze, compose, sign-request, broadcast-request, confirmation, audit, and error. Financial/custody-sensitive actions must be routed through stricter authorization gates than read-only intelligence.

### NEO Lingo / Lexicon
Normalize NEOpay terminology, especially: wallet, address, asset, balance, transaction, order, order match, dispenser, compose, unsigned transaction, signed transaction, broadcast, confirmation, custody, signer, Counterparty, XCP, NOMNI, W.O.M.E., treasury, circulating supply, authoritative data, calculated data, estimated data, and unavailable data.

### NEO Investments / NEO Digital Capital / Family Office
NEOpay can function as the user-facing Bitcoin-native asset and market terminal for authorized NEO economic instruments. Investment, treasury, valuation, capital-markets, and distribution workflows must consume verified ledger state and preserve legal/compliance boundaries appropriate to the relevant instrument and jurisdiction.

### Nibiru / Treasury / World Monetary System layers
NEOpay may expose and route approved treasury, reserve, asset, and settlement information, but must not conflate internal monetary doctrine with externally recognized legal tender, regulated deposit-taking, securities status, or banking authority.

## Product data principles

- NOMNI is the primary NEOpay asset experience, but the wallet architecture remains extensible to other Counterparty assets.
- Asset divisibility must be respected dynamically when constructing quantities.
- Historical charts must use reconstructable data only; otherwise state that historical data is unavailable.
- Market-price fields must state unavailable when no trustworthy source exists.
- Calculated circulating supply must disclose methodology.
- Treasury balances and asset metadata must be sourced from live/verified data where production decisions depend on them.

## Execution-state model

NEOpay should model at least these states explicitly:

`OBSERVED -> REVIEWED -> COMPOSED -> AWAITING_USER_SIGNATURE -> SIGNED -> BROADCAST_REQUESTED -> BROADCAST_ACCEPTED -> CONFIRMED`

Failure or cancellation at any state must not be represented as progression to a later state.

## Deployment gate

Before NEOpay is treated as production-live:
- Cloudflare Worker deployment must succeed against the correct authorized account.
- Worker health endpoint must be verified externally.
- Proxied Counterparty reads must be verified.
- Frontend API base must point to the verified Worker.
- Concrete signer integration must be verified.
- Broadcast endpoint must be confirmed against authoritative Counterparty production documentation/API behavior.
- End-to-end execution must be tested without exposing custody secrets.

## Canonical rule

Future NEO System components consuming NEOpay must inherit these security, provenance, authorization, and execution-state requirements unless an explicit later canonical decision supersedes them.
