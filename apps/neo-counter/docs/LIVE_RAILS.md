# NEO Counter Live Read-Only Rails

NEO Counter now separates payment observation from transaction authority.

## Bitcoin

The Bitcoin rail uses Blockstream Esplora for address transaction history and transaction confirmation state. Values are normalized from satoshis to BTC. The rail never calls broadcast or signing endpoints.

BTC/USD quotes use a public market-data request. The quote carries a source, timestamp, and 60-second expiry.

## Counterparty XCP / NOMNI

The Counterparty rail uses API v2 address receive endpoints for read-only observation. The merchant address is supplied through `VITE_NEO_COUNTER_RECEIVE_ADDRESS`.

XCP and NOMNI USD quotes are deliberately not hard-coded. Configure `VITE_NEO_COUNTER_QUOTE_ENDPOINT` to point at the NEO market-data service. This is the future integration point for CES/NEO market packets.

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

Copy `.env.example` to the deployment environment and set the merchant receive address. XCP/NOMNI live quoting also requires a NEO market quote endpoint.
