# NEO Dash Architecture

## Product model

NEO Dash is one marketplace with multiple service surfaces rather than separate incompatible apps.

`NEO Dash -> NEO Ride | NEO Eats | NEO Delivery | NEO Grocery | NEO Errands`

Shared platform capabilities:

1. NEOpass identity
2. provider/merchant role authorization
3. wallet challenge verification
4. geospatial dispatch and matching
5. quote/pricing engine
6. NEO Counter checkout
7. active-job tracking
8. completion proof
9. provider/merchant payout ledger
10. NEO Statements accounting
11. ratings/reputation
12. NEO Relations CRM

## Core entities

`Account -> Provider Profile -> Capability -> Vehicle/Merchant -> Availability -> Job -> Payment -> Payout -> Review`

A provider capability is explicit and scoped. Examples:

- DRIVER + approved vehicle
- COURIER + delivery capability
- MERCHANT + approved store/menu
- FLEET_OPERATOR + managed drivers/vehicles

## Job ledger separation

NEO Dash uses separate logical ledgers for:

- **Identity ledger** — NEOpass identity and account status
- **Authority ledger** — NEOworks provider/merchant permissions
- **Dispatch ledger** — request, offer, match, location, and job state
- **Commerce ledger** — itemized ∞ quote and checkout state
- **Settlement ledger** — BTC/XCP/NOMNI settlement and provider payout
- **Reputation ledger** — job-linked ratings and trust signals

No single ledger substitutes for another.

## Dispatch boundary

Matching should consider only provider data required for the service: service capability, availability, operating zone, current location, active-job state, capacity, and applicable vehicle/merchant constraints.

Precise customer/provider coordinates are operational data and must not be treated as public profile data.

## Payment boundary

Customer quote amounts are always derived by trusted server-side pricing logic. Client-submitted totals are advisory inputs at most and cannot become authoritative charges.

Provider payouts are created only after the job reaches COMPLETED and the corresponding payment has reached the required settlement state. Payout execution remains a separately enabled, idempotent operation.

## Initial API surface

Suggested MVP endpoints:

- `GET /health`
- `POST /wallets/challenge`
- `POST /wallets/verify`
- `POST /providers`
- `POST /providers/:id/capabilities`
- `POST /providers/:id/availability`
- `POST /dash/quotes`
- `POST /dash/jobs`
- `GET /dash/jobs/:id`
- `POST /dash/jobs/:id/match`
- `POST /dash/jobs/:id/accept`
- `POST /dash/jobs/:id/arrive`
- `POST /dash/jobs/:id/pickup`
- `POST /dash/jobs/:id/complete`
- `POST /dash/jobs/:id/checkout`
- `POST /counter/payment-webhook`
- `GET /dash/jobs/:id/statement`

## MVP implementation order

1. job/provider data model
2. quote engine with server-derived ∞ totals
3. dispatch/matching abstraction
4. NEO Counter checkout adapter
5. payment webhook state transitions
6. completion and payout materialization
7. merchant/menu/cart layer for NEO Eats
8. maps/routing provider adapter
9. mobile PWA experience
10. production readiness/canary controls patterned after NEO Pads
