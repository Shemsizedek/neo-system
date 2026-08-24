# NEO Miner Commerce Backend — v0.18

Server-side commerce orchestration for NEO Miner physical products and Digital NEO Miner hashrate contracts.

## Responsibilities

- authoritative, expiring quotes
- FX-source verification
- checkout-session creation
- payment-provider abstraction
- physical inventory and digital hashrate locks
- idempotent payment-event processing
- order-state transitions
- digital mining-contract activation gates
- receipt/invoice records
- refund orchestration
- tax/shipping extension hooks

## Trust boundaries

The browser is never authoritative for price, FX, payment confirmation, capacity, inventory, tax, shipping, contract activation, or refunds.

Live payment credentials and signing secrets must be supplied from server-side secret storage. They must never be persisted in public schemas or returned to the storefront.

Digital NEO Miner activation requires all of the following:

1. confirmed payment;
2. non-expired authoritative quote;
3. required compliance state cleared;
4. active, unexpired capacity lock;
5. sufficient verified physical SHA-256 backing;
6. executed mining-contract record;
7. non-simulation mode.

Physical NEO Miner fulfillment requires a real inventory reservation and a commercially released SKU.

## Failure posture

Commerce fails closed. Duplicate provider callbacks are idempotent. Unknown or invalid event transitions are rejected. No payment event can create BTC production, and no estimated mining value can be posted as verified BTC.
