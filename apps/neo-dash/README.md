# NEO Dash

NEO Dash is the NEO Ecosystem marketplace for rides, food delivery, package delivery, grocery delivery, courier work, errands, and other on-demand local logistics.

## Origin protocol

- Customer, driver, courier, and merchant identity: NEOpass
- Provider and merchant marketplace authorization: NEOworks
- Checkout/payment interface: NEO Counter
- Commercial price presentation: World Currency (`∞`)
- Settlement rails: configured NEO-supported Bitcoin / Counterparty rails
- Driver/courier/merchant payout destination: verified provider wallet
- Accounting and receipts: NEO Statements
- Customer/provider relationship layer: NEO Relations CRM

## Marketplace surfaces

- **NEO Ride** — passenger rides and scheduled transportation
- **NEO Eats** — restaurant and prepared-food ordering/delivery
- **NEO Delivery** — packages, documents, retail goods, and local courier jobs
- **NEO Grocery** — grocery and household-item shopping/delivery
- **NEO Errands** — pickup/drop-off and other approved local tasks

The shared marketplace brand is **NEO Dash**. The protocol should use one account, wallet, reputation, dispatch, payment, and settlement layer across all service types.

## Roles

- Customer
- Driver
- Courier
- Merchant
- Fleet / Delivery Operator
- NEO Dash Operations

A provider may hold multiple roles, but every role is separately permissioned. A verified rider account does not automatically become a driver, courier, or merchant account.

## Core rule

NEOpass establishes identity and account eligibility. NEOworks records the provider's approved service roles and operating permissions. For regulated or safety-sensitive services, identity verification is not sufficient by itself: vehicle authority, driver's-license status, insurance, merchant authority, and other jurisdiction-specific requirements remain separate operational gates.

NEO Dash never treats possession of a Counterparty asset as proof of a driver's license, insurance policy, restaurant license, ownership of goods, or legal authority to provide a regulated transportation or delivery service.

## Unified job model

`Service Request -> Quote -> Provider Search -> Match -> Provider Accept -> Payment Authorization -> Pickup/Arrival -> In Progress -> Drop-off/Completion -> Settlement -> Review -> Statement`

Canonical job states:

`DRAFT -> QUOTED -> MATCHING -> OFFERED -> ACCEPTED -> PAYMENT_PENDING -> CONFIRMED -> ARRIVING -> PICKUP_READY -> IN_PROGRESS -> COMPLETED -> SETTLED -> CLOSED`

Exception states: `CANCELLED`, `EXPIRED`, `NO_PROVIDER`, `REFUNDED`, `DISPUTED`, `SUSPENDED`.

## Service-specific execution

### Ride

`Request -> Driver Match -> Driver Arrives -> Rider Pickup -> Trip -> Drop-off -> Settlement`

### Food / Grocery

`Cart -> Merchant Confirm -> Courier Match -> Pickup -> Delivery -> Settlement`

### Package / Courier

`Shipment Request -> Quote -> Courier Match -> Sender Pickup -> Transit -> Recipient Delivery -> Settlement`

## Pricing

Commercial prices are displayed in World Currency using the `∞` symbol. The pricing engine may combine:

- base fare / service fee
- distance
- estimated duration
- merchant subtotal
- delivery fee
- wait time
- tolls / approved pass-through costs
- provider incentive
- demand adjustment
- taxes or statutory fees where applicable

All charge components must be itemized. The customer-visible `∞` amount and the actual BTC/XCP/NOMNI settlement amount remain distinct accounting fields.

## Safety and trust boundaries

- Never request or store customer/provider private keys.
- Wallet ownership is established by signature challenge.
- Driver/courier location access must be purpose-limited and job-scoped.
- Customer exact location must not be exposed beyond what is required to fulfill the active job.
- Provider identity, vehicle/merchant authority, job state, payment state, and blockchain settlement are separate auditable records.
- Provider payouts are idempotent and fail closed until a job is completed and payment settlement is confirmed.
- No live payout or money movement is enabled merely by creating this application scaffold.
