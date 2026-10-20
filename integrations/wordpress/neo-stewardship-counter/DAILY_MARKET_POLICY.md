# NEO Counter daily market pricing — 0.15.0

User-directed markup: 9%, replacing the previous 2% spread, fixed 2,000-satoshi allowance and 1,000-satoshi rounding. No additional fixed allowance is added.

Total atomic currency units = ceil(quantity × bond BTC rate × currency atomic scale × 109 / (currency BTC rate × 100)). Currency divisibility comes from the ledger asset API; indivisible currencies are payable only in whole units. Fractional valuation remains visible in the breakdown. PHP and JavaScript calculate the same rational result with bounded integer arithmetic. Prepared orders remain limited to 10 BTC of bond reference value.

## Sources and identity
- Daily TokenScan /api/asset/{asset} BTC market_info price; current owner and asset name must match the configured registry. The two supplied authority addresses remain separate from the collection wallet.
- NOMNI's current owner is the supplied currency treasury even though its original issuer differs. Ownership and original issuance are recorded separately.
- Twenty-five catalog currencies matched exact asset names in the supplied CP2 treasury ownership index; BTC and XCP are native entries. No ticker-only or ambiguous alias matching was used. Missing catalog mappings remain unavailable.
- CP2 fallback: https://api.xcpdex.com/asset/{asset}/trades?limit=100, latest positive BTC or XCP execution in the first 100 rows within 24 hours. XCP quotes use the same day's XCP BTC mark. Asset, quote denomination, time and transaction ID are checked. Price is quantized to one satoshi per unit. Classic never borrows CP2 market data.
- TokenScan does not provide the last-trade timestamp in its asset market panel. Record retrieval time and keep upstreamTradeTimeKnown false for that source. Daily retrieval is not proof that the underlying trade occurred today.

## Schedule and freshness
Prices are frozen per UTC valuation day, separately per asset and ledger. WordPress schedules a daily refresh and staggers individual fetches 15 seconds apart. WP-Cron is traffic-triggered; the first request for a missing current-day rate also refreshes it. Prior-day prices are never silently substituted after an outage. Individual quotes expire after five minutes or UTC midnight, whichever comes first. The public read-only rates endpoint sends no-store headers so a cached page can retrieve a current quote.

## Checkout boundary
Prepared checkout records save the actual currency asset, ticker, atomic precision, total, 900 basis-point markup, daily source snapshots, quote reference, selected ledger and Indenture hash. The backend recalculates from trusted rates; it does not accept a browser-provided total. Zero, unmapped or unavailable rates block preparation. An issuance alone does not establish a market price.

Pricing does not implement confirmed-payment reconciliation, inventory reservation or confirmed bond delivery. Orders remain PREPARED_NOT_PAYABLE and no payment-complete claim is made. A 9% charge is a pricing rule, not a guarantee of actual Bitcoin network fees or executable market liquidity.

Validation: native PHP harness tests daily cache reuse, ownership, stale-price rejection, conversion/quantity/precision, the BTC bound and DEX fallback freshness; JS tests rational calculation and rendered total synchronization. Source audit JSON records the observed CP2 index responses, not an executable offer.
