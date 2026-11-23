# Project 144 Coinbase gateway — offline sandbox gate

The simulator in `sandbox.mjs` requires explicit enablement, returns `executable: false`, and makes **zero network requests**. It does not connect to Coinbase, NEOpass, NeoMask, NEO Bank's server, NEO Pay or NEO FX.

## Security boundary

- External provider is allowed to support only approved **native BTC / Bitcoin** and verified fiat services. No ETH, Base, EVM, cbBTC, WBTC, ERC tokens, stablecoins or transaction attribution.
- Never send raw customer profiles, NEO secrets, wallets, credentials, account database objects or authorization tokens to vendor.
- Read-only request intents only: quote, status, reconcile, deposit-instructions. Even deposit instructions are **simulated only** here and must never be displayed as fundable addresses.
- Verify exact network on each endpoint and each response; do not trust `BTC` ticker or cross-chain balances.
- Deployment, API credentials, money movement, or agent tool access remain **not authorized by this gate**.

## Next deployment prerequisites

1. Verify Coinbase account/product and native Bitcoin support on NEO's legal entity, geography, fiat rail and approved transaction types.
2. Establish private gateway on isolated account/service with default-deny egress, distinct provider-scoped credentials in secrets manager, no NEO Core/database subnet route.
3. Add canonical authenticated quote, reconciliation, expiration and provenance checks with transaction value ceilings; require legal/AML/KYC and sanctions reviews.
4. Test and document resilience, outbound network allowlists, idempotency, audit records, human approval, withdrawal address allowlists, monitor + kill switch.
5. Stage on test data only, test before expanding permissions. Production remains untouched.

Run `node --test integrations/coinbase/*.test.mjs`.
