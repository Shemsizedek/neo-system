# NEO Pads

NEO Pads is the NEO Ecosystem marketplace for short stays, rooms, extended stays, and host-operated lodging.

## Origin protocol

- Identity and access: NEOpass
- Host marketplace authorization asset: HOMESHARES
- HOMESHARES authority/source reference: Orange Chip™ wallet `1Ky2wRYYrJzqdQJH64F7TR98fqLxJs7LK8`
- Marketplace entitlement orchestration: NEOworks
- Checkout/payment interface: NEO Counter
- Commercial price presentation: World Currency (`∞`)
- Settlement rails: configured NEO-supported Bitcoin / Counterparty rails
- Host payout destination: verified host Counterparty wallet

## Core rule

A host proves control of a registered Counterparty wallet and satisfies the current HOMESHARES policy before a NEO Pads listing can be activated. Property authority/verification is a separate gate: possession of HOMESHARES alone does not prove ownership or authority to rent a physical property.

HOMESHARES remains host-held during an ordinary booking. NEOworks records a time-bounded occupancy entitlement for the verified NEOpass member. The entitlement expires at checkout; it does not imply transfer of title to HOMESHARES or the underlying real estate.

## MVP lifecycle

`DRAFT -> AVAILABLE -> QUOTED -> RESERVED -> PAYMENT_PENDING -> CONFIRMED -> ACCESS_READY -> CHECKED_IN -> ACTIVE_STAY -> CHECKED_OUT -> SETTLED -> CLOSED`

Exception states: `CANCELLED`, `EXPIRED`, `REFUNDED`, `DISPUTED`, `SUSPENDED`.

## MVP services

1. NEOpass identity verification
2. Wallet challenge/signature verification
3. HOMESHARES balance verification
4. NEOworks host authorization
5. Property and listing registration
6. Availability and quote engine
7. `∞` World Currency pricing
8. NEO Counter checkout adapter
9. NEOworks occupancy entitlement
10. NEOpass access credential
11. Host payout and NEO Statements integration

## Security boundaries

- Never request or store host/guest private keys.
- Wallet ownership is established by signature challenge.
- Door/access systems receive a minimum-purpose credential, not wallet balances or financial portfolio data.
- Booking, payment, entitlement, and blockchain state are separate auditable ledgers.
- HOMESHARES policy ratios are configuration/governance values and must not be inferred from the asset name or supply.
