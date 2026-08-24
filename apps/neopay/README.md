# NEOpay

NEOpay is the Counterparty/XCP wallet, NOMNI asset terminal, NEOSCAN explorer, economics dashboard, and NOMNI/XCP exchange application for the NEO System.

## Source of truth

- Primary source: `Shemsizedek/neo-system`
- Primary development branch: `feature/neopay-github-primary`
- Runtime route: `#/neopay`
- Source module: `src/neopay/`
- Base44 app `6a7662f88568458a68b93c93` is retained as a secondary backup/prototyping environment.
- Counterparty API v2: `https://api.counterparty.io:4000/v2`

## Security model

NEOpay is non-custodial. Private keys, seed phrases, mnemonics, WIF values, and wallet secrets must never be committed to this repository, sent to a backend, placed in browser storage, or logged.

User-controlled signing architecture:

`Review -> construct unsigned transaction -> user-controlled signer -> signed transaction -> broadcast -> confirmation`

Real transaction submission remains disabled until a compatible signer is connected and a genuine signed transaction is available.

## Current GitHub build

Implemented foundation:

- Dashboard
- Watch-only wallet/address loading
- Counterparty balances
- Transaction history
- NEOSCAN foundation
- NOMNI asset metadata
- Economics dashboard foundation
- NOMNI/XCP open-order parsing
- Best bid / ask / spread
- My Orders
- Recent Trades
- Review-only trading form
- Responsive desktop/mobile interface
- Graceful degraded/unavailable data states

Staged next:

- Backend proxy/service for production read calls
- Dispensers explorer
- Dedicated asset search
- historical NOMNI supply index
- secure browser wallet/signer adapter
- signed transaction broadcast path

## Integration rule

Preserve existing NEO System functionality. NEOpay is a contained application module and must not replace the repository root application or overwrite unrelated modules.

Cached, calculated, or estimated data must never be represented as authoritative blockchain state. When Counterparty data is unavailable, the UI must report that state rather than fabricate values.
