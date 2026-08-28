# NEO Exchange / NEO DEX — ORIGIN

GitHub-first implementation of the NEO Exchange professional Bitcoin / Counterparty XCP terminal.

## Deployment roles

- **GitHub** — canonical source, API source code, CI/CD and release history.
- **GitHub Pages** — primary public static frontend.
- **Base44** — retained as the visual/reference implementation and fallback prototyping environment.
- **API runtime** — the backend source lives in `api/neo-exchange/`; deploy it to a server/runtime that can execute Node.js and expose HTTPS. GitHub Pages itself is static and cannot run this backend process.

## ORIGIN sources

Treasury address:
`18FyntJG9hdXYvanm67mGgbyo1P7adckvg`

Orange Chip™ foundation address:
`1Ky2wRYYrJzqdQJH64F7TR98fqLxJs7LK8`

The ORIGIN gate reads Counterparty balances from these addresses through the NEO Exchange API adapter. Market-price values are not fabricated. Price, OHLC, orderbook and execution fields remain empty or explicitly marked until a verified source is wired.

## Local frontend

```bash
cd apps/neo-exchange
npm install
npm run dev
```

## Local API

```bash
PORT=8787 node api/neo-exchange/server.mjs
```

Optional environment variables:

- `COUNTERPARTY_API_BASE`
- `NEO_EXCHANGE_ALLOWED_ORIGIN`

Set `window.NEO_EXCHANGE_API_BASE` before the app bundle loads when the public frontend and API use different origins.

## Security model

The ORIGIN gate does **not** store private keys and does **not** auto-broadcast orders. The `/orders/compose` endpoint is intentionally disabled until user-controlled signing, transaction validation, fee review, broadcast, failure recovery, and audit logging are implemented and reviewed as separate gates.

## Planned terminal layers

MT4-style workstation shell, BTC/XCP market directory, Counterparty asset directory, Orange Chip™ ticker, balances, orderbook, candlestick/indicator adapter, order review, trade history, portfolio/P&L analytics, watchlists, Freewallet-style asset workflows and a versioned NEO Exchange API.
