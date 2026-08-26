# NEO Telegram Reference Node v0.1

Reference backend for NTP-1.0 / NVSN integration.

## Run

```bash
cd apps/neo-telegram
npm start
```

Endpoints:
- `GET /health`
- `GET /api/telegrams`
- `POST /api/telegrams`

This is a DEMO reference node. Messages are stored in memory and are not cryptographically signed, routed over a live NVSN network, or settled through Bitcoin/Lightning/Counterparty.

Frontend prototype: `docs/neo-telegram/` for GitHub Pages.
