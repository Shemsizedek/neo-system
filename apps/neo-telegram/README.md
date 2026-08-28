# NEO Telegram Reference Node v0.1

Reference backend for NTP-1.0 / NVSN integration.

## GitHub-first deployment model

GitHub is the canonical source-of-truth for the NEO Telegram prototype. GitHub Actions publishes the public frontend and versioned backend snapshots to GitHub Pages.

Public Pages surfaces after deployment:
- `/neo-telegram/` — browser frontend
- `/api/neo-telegram/status.json` — service/network status snapshot
- `/api/neo-telegram/protocol.json` — NTP protocol registry
- `/api/neo-telegram/build.json` — deployed commit/build metadata

The static API snapshots live in `data/neo-telegram/` and are copied into the Pages artifact by `.github/workflows/pages.yml`.

## Reference runtime

```bash
cd apps/neo-telegram
npm start
```

Runtime endpoints:
- `GET /health`
- `GET /api/telegrams`
- `POST /api/telegrams`

GitHub Pages is static hosting, so it does not execute this persistent Node service. The Node service remains the reference runtime for a future writable NVSN relay/API without changing the NTP envelope contract.

## Safety boundary

This is a DEMO reference node. Browser-generated messages are explicitly unsigned. No private keys are stored, no live NVSN routing occurs, and no Bitcoin/Lightning/Counterparty transaction is created or broadcast.
