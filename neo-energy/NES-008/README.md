# NES-008 — NEO Utility Accounting Simulator

This is a **simulation-only** accounting prototype, not a financial meter/billing service.

Run standard-library tests in this directory with `python -m unittest -v`.

The ledger accepts interval import/export readings, rejects overlapping intervals, rejects nonfinite/negative energy, treats exact duplicate records idempotently, and quarantines conflicting record IDs through exceptions. It never marks totals as billing eligible or authorizes field control.

Known limitations: in-memory persistence only, no authentication, no customer UI, no revenue meter certification, no signed provenance validation, no production tariff engine, no live meter connection, and no physical dispatch. These must be separately designed, reviewed and tested.
