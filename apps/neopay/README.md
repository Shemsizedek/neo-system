# NEOpay

NEOpay is the Counterparty/XCP wallet, NOMNI asset terminal, NEOSCAN explorer, economics dashboard, and NOMNI/XCP exchange application for the NEO System.

## Integration status

- Source application: Base44 app `6a7662f88568458a68b93c93`
- Parent repository: `Shemsizedek/neo-system`
- Integration branch: `feature/neopay-base44`
- Target module path: `apps/neopay/`
- Counterparty API v2: `https://api.counterparty.io:4000/v2`

## Security model

NEOpay is non-custodial. Private keys, seed phrases, mnemonics, WIF values, and wallet secrets must never be committed to this repository, sent to the backend, stored in Base44 entities, placed in browser storage, or logged.

User-controlled signing follows:

`Review -> construct unsigned transaction -> user-controlled signer -> signed transaction -> broadcast -> confirmation`

Real transaction submission must remain disabled unless a compatible signer is connected and a genuine signed transaction is available.

## Core modules

- Dashboard
- Wallet
- Balances
- Transactions
- NEOSCAN
- NOMNI asset explorer
- Economics dashboard
- Exchange
- Order book
- My Orders
- Trades
- Dispensers
- Assets
- Settings

## Integration rule

Preserve existing NEO System functionality. NEOpay is added as a contained application module and must not replace the repository root application or overwrite unrelated modules.

Cached or calculated data must never be represented as authoritative blockchain state. When Counterparty data is unavailable, the UI should display a clear unavailable/degraded state rather than fabricated values.
