# NEO Miner Commerce, Orders & Fulfillment Platform v0.16

## Purpose

This layer connects NEO Miner productization to customer transactions while preserving strict distinctions between quotes, payments, inventory, hashpower capacity, contracts, mining performance, and BTC settlement.

## Commerce flow

Customer -> storefront -> SKU selection -> jurisdiction/currency eligibility -> quote lock -> payment intent -> payment confirmation -> order -> reservation -> contract/fulfillment -> activation -> mining/ownership history -> support/refund/RMA.

## Product classes

- Physical NEO Miner hardware
- Digital NEO Miner contract-backed hashrate
- Hosting/service bundles
- Enterprise mining allocations

## Core rules

1. A catalog listing does not mean a SKU is commercially released. Only SKUs with release status ENABLED may be sold.
2. A listed World Currency does not automatically mean the currency has a live payment rail.
3. Quotes expire and must preserve their rate source, timestamp, fees, taxes, and assumptions.
4. Digital NEO Miner orders require reservable verified hashpower capacity before activation.
5. Physical hardware orders require inventory or production allocation before fulfillment.
6. Payment confirmation is separate from BTC mining production and BTC settlement.
7. Simulated or demo transactions may never be represented as real orders, payments, shipments, mining production, or settlements.
8. Private keys, seed phrases, payment credentials, and provider secrets do not belong in customer-facing records.
9. Refunds, cancellations, chargebacks, and order changes must be auditable.
10. Taxes, duties, shipping, sanctions, AML/KYC, consumer protection, and money-transmission treatment are jurisdiction/provider dependent and must be implemented through configured providers/policies.

## Customer experience

### Physical order

1. Browse released hardware SKU.
2. Select quantity and destination.
3. Select supported payment currency/method.
4. Receive locked quote.
5. Accept terms and place order.
6. Complete payment/compliance requirements.
7. Reserve inventory or production capacity.
8. Fulfill and ship.
9. Customer activates serial/device identity.
10. Device joins NEO Miner fleet.

### Digital NEO Miner order

1. Browse released hashrate product.
2. Select TH/s or PH/s tier and contract term.
3. Select supported World Currency payment rail.
4. Receive locked quote.
5. Accept mining-contract terms/risk disclosures.
6. Complete payment/compliance requirements.
7. Reserve verified mining capacity.
8. Create contract and allocation.
9. Activate only when payment and backing conditions are satisfied.
10. Attribute actual verified mining performance and settlements separately.

## Order states

- CART
- QUOTED
- PAYMENT_PENDING
- PAYMENT_REVIEW
- PAID
- RESERVED
- CONTRACT_PENDING
- READY_TO_FULFILL
- FULFILLING
- SHIPPED
- ACTIVATION_PENDING
- ACTIVE
- COMPLETED
- CANCELLED
- REFUND_PENDING
- REFUNDED
- DISPUTED
- CHARGEBACK
- FAILED

## Reservation types

- PHYSICAL_INVENTORY
- PRODUCTION_SLOT
- HASHPOWER_CAPACITY
- HOSTING_SLOT

Reservations must have expiration timestamps and must be released when an order fails, expires, is cancelled, or is refunded where appropriate.

## Payment and currency architecture

World Currency Registry -> Eligibility Gate -> Quote Engine -> Payment Router -> Provider/Blockchain -> Confirmation -> Commerce Ledger.

Never mark a payment PAID based solely on a client callback. Confirm with the configured payment provider or blockchain settlement source.

## Quote integrity

Every quote stores:

- quote ID
- SKU/product
- quantity or hashrate
- base accounting currency
- selected payment currency
- FX source/rate
- taxes/duties estimate
- payment fees
- network fees
- shipping/hosting fees
- total
- quote creation time
- expiration time
- simulation/live flag

## Physical fulfillment

Fulfillment records track:

- warehouse/factory source
- serial numbers
- production records
- carrier
- tracking reference
- destination jurisdiction
- export/import flags
- package status
- delivery confirmation
- activation eligibility

Do not claim shipment or delivery without an actual fulfillment event.

## Digital fulfillment

Digital fulfillment records track:

- order ID
- contract ID
- capacity reservation ID
- allocation ID
- contracted hashrate
- source miner/farm pool
- start/end time
- SLA
- backing status
- activation state

Digital NEO Miner contracts must remain distinguishable from ownership of a physical miner, securities, deposits, guaranteed returns, or guaranteed BTC production.

## Refund model

Refund eligibility depends on product type, contract state, payment method, jurisdiction, and consumed service/mining time.

Refunds require:

- request ID
- original order/payment
- reason
- eligible amount
- currency
- fees/non-refundable amounts
- approval status
- settlement reference
- audit log

## Customer account

The customer portal should eventually expose:

- orders
- invoices/receipts
- payments
- shipments
- physical devices
- digital mining contracts
- hashrate allocations
- mining performance
- BTC settlements
- support cases
- refunds/RMAs

## API boundaries

Recommended service boundaries:

- Catalog Service
- Quote Service
- Currency/FX Service
- Payment Router
- Order Service
- Reservation Service
- Contract Service
- Fulfillment Service
- Activation Service
- Customer Ledger
- Refund Service

All writes must be idempotent where duplicate provider callbacks or retries are possible.
