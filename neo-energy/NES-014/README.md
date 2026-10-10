# NES-014 — Persistent Simulation Store and Customer API Contract

Status: **simulation-only local development**. This is not production utility infrastructure.

## Implemented
- SQLite-backed interval event persistence using Python standard library.
- Duplicate idempotency and conflicting duplicate / overlap rejection.
- Separate import/export quantities using Decimal strings.
- Cross-site query partitioning (NOT customer authorization).
- Unit tests for persistence after restart, invalid inputs, duplicate behavior, interval overlaps and site filtering.

To test:
```
python -m unittest discover -s neo-energy/NES-014 -p 'test_*.py' -v
```

## Planned API (NOT implemented)
- GET /v1/energy/customer/sites — NEO Pass verified customer site grants
- GET /v1/energy/customer/sites/{site_id}/usage — authorized, read-only time series
- GET /v1/energy/customer/sites/{site_id}/statements/simulated — NOT A BILL
- GET /v1/energy/customer/sites/{site_id}/outages — qualified/simulated labeling
- POST /v1/energy/operator/meter-import — administrator-only simulator ingestion

## Production blockers
A server-side NEO Pass token verifier and site-grant store, encryption/key management, appropriate PostgreSQL-based transaction isolation, signed meter provenance, accurate tariff/version policy, retention controls, telemetry observability, migrations, load testing, and privacy/security review are required. This SQLite module is unsuitable for concurrent production writes and its totals() method has no authentication; it must never be exposed directly to customers.

No API server, customer UI, monetary settlement, bill issuance, external networking or field control is deployed.
