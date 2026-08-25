# NEO Teller v0.2 — Live Data Rails

This milestone introduces a read-only network gateway for NEO Teller.

## What is live

- Bitcoin chain-height monitoring through an Electrs-compatible endpoint.
- Counterparty API health through a configurable API base URL.
- Counterparty asset metadata lookup for XCP and NOMNI.
- Frontend snapshot adapter for NEO Teller.

## What remains sandboxed

- Transaction composition.
- Private-key custody.
- User signing.
- Broadcast.
- Fiat settlement.
- Card-network authorization.
- Visa, Mastercard, SWIFT or bank connectivity.

The gateway deliberately exposes no POST route capable of moving funds.

## Run

```bash
cp .env.example .env
npm run neo-teller:server
npm run dev
```

Set `COUNTERPARTY_API_URL` to a Counterparty Core/API v2 endpoint you control or trust. For production Bitcoin reads, operate your own Electrs-compatible service instead of depending on a public endpoint.

The browser uses `VITE_NEO_TELLER_API_URL` to reach the read-only gateway.

## Architecture

```text
NEO Teller UI
    |
    v
Read-only NEO Teller Gateway
    |---------------------|
    v                     v
Counterparty API v2    Bitcoin Electrs
    |
    v
BTC / XCP / NOMNI metadata and network state
```

The next security gate is user-controlled transaction composition and signing. That must remain a separate module from the read-only data plane.
