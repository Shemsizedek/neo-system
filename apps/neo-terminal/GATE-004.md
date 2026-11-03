# NEO-TERMINAL-004 — World Currency/USD Quote Rails

Gate 004 introduces a selectable base/quote market route in NEO Explorer and the standalone NEO Terminal. The World Treasury issuance address is `18FyntJG9hdXYvanm67mGgbyo1P7adckvg`. Market candidates include NOMNI/USD, BTC/USD, XCP/USD, and Treasury-issued assets such as EUROCASH where issuance data can be verified.

**Critical distinction:** A string like `NOMNI/USD` is a proposed market symbol, not proof of a live trading pair, USD backing, bank deposit, fiat redemption, or executable liquidity. Counterparty on-chain orders require a real Counterparty asset on each side; `USD` is only a reference denomination unless an independently verified settlement instrument and venue are established. A public Bitcoin/USD price feed is indicative, not a NOMNI/USD order book.

## Delivered
- Dynamic quote denomination selector in NEO Explorer, replacing the XCP-only hardcoded rail.
- Treasury issuer discovery populates candidate base and quote assets, with explicit loading/unavailable states.
- No synthetic order-book rows are presented for unsupported markets.
- Separate direct Counterparty quote requests survive failure of ancillary full snapshot calls.
- Standalone NEO Terminal world currency market selector using issuer-observed assets.

## Open requirements for public NOMNI/USD trading
1. Independently verify NOMNI issuance identity and authorized issuer; confirm asset divisibility and any transfer restrictions.
2. Define USD settlement instrument (bank USD, regulated stablecoin, or actual tokenized USD claim), issuer, custody, redemption and legal classification.
3. Connect executable bid/ask liquidity with quantity, fees, freshness, order identity and venue authorization.
4. Reuse the existing Counterpay/NEOpay user-controlled signer flow; require NEOpass authorization, order review and approval before any signing or broadcast.
5. Record matched settlement transaction IDs in Crown Chain, NEO Ledger and NEO Books only after authenticated adapter evidence and reconciliation checks.
6. Review payment, securities, commodities, money transmission and consumer-protection obligations before public solicitation or execution.

**Release:** This gate is a read-only market-discovery integration; no public NOMNI/USD execution or institutional reconciliation is claimed.
