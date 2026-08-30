# NEO Pads ↔ NEO Counter gateway contract

Status: source-verified against the NEO Counter implementation in this repository.

## Checkout boundary

NEO Counter currently exposes a browser checkout gateway through `apps/neo-counter/src/gateway/intent.ts`. NEO Pads therefore does not assume a server-side `POST /checkout` endpoint.

NEO Pads constructs a browser URL containing the v1 gateway intent parameters:

- `checkout=1`
- `service=NEO Pads`
- `order=<bookingId>`
- `label=NEO Pads · <bookingId>`
- `amount=<World Currency amount in 1/100 minor units>`
- `currency=WORLD_CURRENCY`
- `rail=BTC|XCP|NOMNI`
- optional `success_url`
- optional `cancel_url`

The API returns `REDIRECT_REQUIRED` and the generated `checkoutUrl`; it does not claim that payment has been created or settled.

## Settlement boundary

NEO Counter's gateway can redirect a browser back with checkout-result metadata. That redirect is not authoritative payment proof. NEO Pads must independently verify settlement before changing a booking from `PAYMENT_PENDING` to `CONFIRMED`, enabling an occupancy entitlement, or creating a host payout obligation.

The existing signed payment-event and chain-confirmation paths remain separate from the browser redirect contract.

## Pricing boundary

The commercial price remains World Currency using the `∞` symbol. The gateway's `amount` parameter is an integer minor-unit representation required by the current NEO Counter UI contract; `∞500` is encoded as `50000` while NEO Pads preserves the commercial amount as `500` World Currency in its own booking ledger.

## Safety

- Supported settlement rails are limited to BTC, XCP, and NOMNI.
- Live payout execution remains fail-closed.
- The browser redirect cannot activate fulfillment by itself.
- Production checkout and return URLs must use HTTPS.
- NEO Pads does not receive private keys or sign Bitcoin/Counterparty transactions.
