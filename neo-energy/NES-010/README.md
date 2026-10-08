# NES-010 — Community Energy Ledger / CES Bridge

Status: specification and simulation-only reference implementation.

Energy units (kWh), monetary invoices (USD), CES member credits, time-equity hours, V-dollars, and NOMNI balances are distinct accounting domains. Never convert between them without an approved exchange contract, authorized parties, independently verified ledger source and regulatory/legal review.

## Controls
- Immutable event IDs and compensated reversals; no hard deletion of posted entries.
- Simulated and unverified energy readings do not create redeemable energy credits.
- Exported kWh is a meter observation, not automatically a money claim.
- Transfer and settlement APIs disabled by default.
- Explicit tariff version, effective dates, provenance and customer-consent references required for any future production settlement.
- Reconcile meter aggregates against account statement periods with independent import/export registers.
- Use decimals, not binary floats, for accounting amounts.

## Future interfaces (disabled)
POST /v1/energy/settlement-intents
POST /v1/energy/ces-bridge
POST /v1/energy/nomni-bridge

The interfaces are requirements placeholders, not live endpoints.
