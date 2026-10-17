# World Currency checkout catalog — 2026-10-17
Source: data/neo-counter/world-currencies.csv
The source has 118 entries. Three explicit mappings are NMNI -> NOMNI, BTC -> BTC and XCP -> XCP. The other 115 lack on-chain asset identifiers. Published symbols are not automatically asset names or exchange rates. The registry's source treasury differs from the user-confirmed stewardship receiving address; the plugin does not change the receiving address.

Plugin v0.10.0 is installed active on Holy Stewardship. It includes the complete catalog with stable unique entry IDs and preserves duplicate symbols. The GET controls explicitly select ledger and requested currency.

No currencies are newly enabled for collection. Non-BTC selections show the exact missing mapping/quote/settlement requirement, remove BTC quote data and disable checkout preparation. POST preparation rejects non-BTC currency and records BTC explicitly on BTC drafts. Unknown requested currency IDs fail with HTTP 400; they do not silently become BTC.

world-currencies.json is a provenance-backed catalog and acceptance-workflow input, not evidence of token existence, liquidity, parity or completed payment routing. enabledForCollection is false for every entry.

For activation: verify per-ledger asset ID, issuer, divisibility, independently sourced nonzero exchange pricing, payment observation/atomic claim logic and the wallet signing/delivery path. Existing NeoMask package supplies signing components but user installation and treasury import are not completed. Payment verification component remains separate from WordPress persistence. No production payment or token fulfillment is claimed.
