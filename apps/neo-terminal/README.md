# NEO Terminal Gate 002 — Bitcoin Trade Desk

## Implemented
- Dedicated responsive browser terminal at `apps/neo-terminal/`; separate from NEO Explorer and NEO Exchange.
- Real, read-only fetches to CoinGecko BTC/USD, mempool.space Bitcoin chain tip, and Counterparty v2 address issuance endpoint. All requests are bounded by timeouts and expose failure states.
- World Treasury issuance search and internal Coin/Cash classification for issuer `18FyntJG9hdXYvanm67mGgbyo1P7adckvg`.
- Crown Chain, NEO Ledger, NEO Books and NEOpass show **integration pending**, not fabricated connections.
- GitHub Pages workflow publishes `/neo-terminal/` on successful main build. The workflow has not been verified by this commit alone.
- NEO DEX and NEOfx navigation; no trading, custody, order submission, or wallet signatures.

## Upstream and licensing
OpenTerminal by ErTasselli/OpenTerminal, upstream snapshot reviewed `aed097c680cd8ec1c391ae06966babe7d6d91fc6`, MIT license. This initial gate **does not copy upstream application code**. Attribution is maintained for architectural reference; copying upstream components later requires including the upstream copyright/license notice.

## Data caution
CoinGecko and mempool.space browser APIs may throttle or restrict cross-origin requests. Counterparty v2 may change its pagination/response schema. Provider reachability and public feed values are not certified for execution or commercial redistribution. The UI displays unavailable when data cannot be verified. Do not mistake public chain tip for Crown Chain Layer 3 attestation.

## Next gates
003: Provider gateway with permitted data licenses, proxy/CORS resilience, quote/market history and bid/ask provenance; tests with fixture-based API contracts.
004: NEO Crown Chain attestation receipts, NEO Ledger and NEO Books reconciliation adapters, NEOpass per-user authentication and encrypted persistence.
005: NEO DEX/NEO Trader staged order lifecycle with NEO Guard and explicit signing authorization.
