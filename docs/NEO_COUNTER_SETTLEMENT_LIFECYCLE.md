# NEO Counter Settlement Lifecycle

NEO Counter checkout results use an explicit lifecycle:

`PENDING -> DETECTED -> SETTLED`

Terminal alternatives are `CANCELLED` and `FAILED`.

## Fulfillment rule

A redirect is never payment proof. A NEO service may consider an order fulfillment-eligible only when all of these are true:

- `settlement_state=SETTLED`
- `settlement_confirmed=1`
- a non-empty blockchain `reference` is returned
- the downstream service independently verifies that reference against its expected rail, asset, destination, amount and confirmation policy

`NEOCheckout.result()` parses the browser return into a normalized result and exposes `fulfillmentEligible`. That flag is a client-side precondition only; it does not replace independent blockchain verification.

## USD/manual mode

USD is display/manual mode in the GitHub Pages architecture. It does not produce cryptographic settlement proof and must not unlock irreversible fulfillment.

## Security boundary

NEO Counter remains read-only for settlement observation. It does not custody private keys, seed phrases, PAN/CVV data or perform server-side Bitcoin/Counterparty signing.
