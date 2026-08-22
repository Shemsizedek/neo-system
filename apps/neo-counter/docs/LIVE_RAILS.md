# NEO Counter Live Read-Only Rails

NEO Counter separates payment observation from transaction authority.

## Bitcoin

The Bitcoin rail uses Blockstream Esplora for address transaction history and transaction confirmation state. Values are normalized from satoshis to BTC. The rail never calls broadcast or signing endpoints.

BTC/USD quotes use public market data and carry a source, timestamp, and expiry.

## Counterparty XCP / NOMNI

The Counterparty rail uses API v2 address receive endpoints for read-only observation. The merchant address is supplied through `VITE_NEO_COUNTER_RECEIVE_ADDRESS`.

### CES / NEO quote pipeline

`src/ces/publisher.ts` now emits a `quotes` collection in each NOMNI market packet. A quote is produced only when normalized CES `OFFER` or `WANT` records contain an explicit positive USD unit price. The publisher accepts explicit fields such as `unitPriceUsd`, `unit_price_usd`, `priceUsd`, or `price_usd`; generic `price`, `rate`, or `unitPrice` fields are accepted only when the same payload explicitly identifies USD as the quote currency.

The quote price is the median of the qualifying source observations. The packet records the sample size, source record IDs, observation time, and methodology. Balances, transaction counts, activity volume, exchange conversion labels, and market-cap claims are never converted into a price.

NEO Counter reads this packet from `VITE_CES_MARKET_PACKET_ENDPOINT`. Quotes older than `VITE_CES_QUOTE_MAX_AGE_MS` are rejected. If no fresh explicit CES quote exists, the optional `VITE_NEO_COUNTER_QUOTE_ENDPOINT` remains available as a fallback. If neither source can provide a valid quote, checkout fails closed instead of inventing a rate.

## Security boundary

This implementation does not:

- compose transactions
- sign transactions
- broadcast transactions
- store private keys or seed phrases
- custody funds
- originate fiat transfers
- process raw cardholder data

A production payment intent is only marked settled after the selected read-only rail observes a matching payment and the configured confirmation policy is satisfied.

## Required configuration

Set the merchant receive address in the deployment environment. For CES-backed XCP/NOMNI pricing, expose the read-only NOMNI market packet from the coordinator pipeline and set `VITE_CES_MARKET_PACKET_ENDPOINT` to that endpoint.
