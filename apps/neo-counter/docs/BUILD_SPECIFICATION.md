# NEO Counter v0.1 Build Specification

## 1. Product objective

NEO Counter is a merchant-services and point-of-sale platform designed around Bitcoin and Counterparty XCP while remaining capable of pricing, checkout, reporting, and settlement across supported world currencies and future regulated payment rails.

The system must present a conventional merchant experience while keeping blockchain, FX, ledger, and settlement complexity behind stable service boundaries.

## 2. Primary users

- Merchant owner
- Cashier / employee
- Customer
- Finance / treasury operator
- Platform administrator
- Developer / integration partner

## 3. Core merchant capabilities

### Merchant account
- Business profile
- Locations
- Employees and roles
- Settlement preferences
- Supported payment methods
- Currency display preferences

### Catalog and checkout
- Products and services
- SKU, price, tax category, inventory flag
- Cart creation
- Discounts
- Tips
- Taxes
- Refund references
- Receipts

### Payment methods
- BTC
- XCP
- Counterparty assets
- QR wallet payment
- Fiat/card placeholders through provider adapters
- Cash/manual tender

### Merchant dashboard
- Gross sales
- Net sales
- Transaction count
- Payment-method mix
- Settlement status
- Asset/currency exposure
- Refunds
- Open payment intents

## 4. Payment-intent lifecycle

States:

`created -> quoted -> awaiting_payment -> detected -> confirming -> settled`

Terminal states:

`expired`, `cancelled`, `failed`, `refunded`

Each payment intent must contain:

- immutable internal ID
- merchant ID
- location ID
- order ID
- fiat display amount
- display currency
- selected payment asset
- quoted asset amount
- quote source
- quote timestamp
- quote expiry
- blockchain/payment reference when available
- settlement target
- status
- idempotency key
- created/updated timestamps

## 5. Quote engine

The quote engine must be provider-agnostic.

Inputs:
- display currency
- display amount
- payment asset
- settlement asset/currency

Outputs:
- customer payment amount
- rate
- provider/source
- timestamp
- expiry
- estimated fees

No external market rate is trusted without timestamp, source, and expiry metadata.

## 6. Bitcoin adapter

Responsibilities:
- create payment request/address abstraction
- generate payment QR payload
- watch/detect transaction references through configured provider
- track confirmation state
- normalize sats/BTC amounts

v0.1 uses an interface and mock adapter. Production private-key custody is explicitly out of scope.

## 7. Counterparty adapter

Responsibilities:
- represent XCP and named Counterparty assets
- build normalized asset payment requests
- record source/destination asset information
- monitor transaction status through a future Counterparty-compatible provider
- preserve asset divisibility metadata

v0.1 uses an interface and mock adapter; no unsigned/signed production transaction construction is required.

## 8. Ledger

Use double-entry concepts for economic events even if the initial implementation is simplified.

Minimum logical accounts:
- merchant receivable
- merchant payable/settlement
- platform fees
- payment clearing
- refunds
- asset inventory/exposure (future)

Every settled/refunded event must be traceable back to the originating payment intent.

## 9. Treasury and settlement preferences

Merchant may configure target allocations such as:

- 100% USD-equivalent
- 100% BTC
- mixed target allocations

v0.1 stores allocation policy only. It must not imply that regulated conversion or custody is live until a compliant provider is connected.

## 10. API surface

Initial conceptual endpoints:

- `POST /v1/payment-intents`
- `GET /v1/payment-intents/:id`
- `POST /v1/payment-intents/:id/cancel`
- `POST /v1/refunds`
- `GET /v1/transactions`
- `POST /v1/quotes`
- `GET /v1/catalog/items`
- `POST /v1/orders`
- `GET /v1/settlements`

All mutable endpoints must support idempotency.

## 11. Non-functional requirements

- Strong tenant isolation
- Auditability
- Idempotent payment operations
- Deterministic money arithmetic using integer minor units / asset quantities
- No floating-point arithmetic for balances
- Provider abstraction for external rails
- Secrets outside source control
- Structured event logs
- Explicit clock/timestamp handling
- Retry-safe webhook processing

## 12. v0.1 acceptance criteria

A merchant can:

1. create/select products,
2. create an order,
3. generate a payment intent,
4. select BTC, XCP, or a Counterparty asset,
5. receive a quoted amount from a mock quote provider,
6. display a QR/payment request,
7. simulate payment detection and settlement,
8. view the transaction in the merchant ledger/history,
9. generate a receipt,
10. configure a settlement preference.

## 13. Deferred production capabilities

- Live card processing
- PAN/CVV storage
- Physical card issuance
- Consumer credit underwriting
- Money transmission
- Custodial wallet services
- Automated fiat conversion
- Regulated stablecoin/fiat custody
- Hardware manufacturing

These capabilities require provider, legal, regulatory, security, and operational workstreams beyond the software prototype.
