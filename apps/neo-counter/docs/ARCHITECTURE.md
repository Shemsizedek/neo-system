# NEO Counter Architecture

## System model

NEO Counter is decomposed into four primary layers:

1. Experience layer
2. Payment core
3. Ledger and treasury
4. External payment/settlement adapters

## Experience layer

Surfaces:
- Merchant web dashboard
- POS terminal UI
- Mobile POS
- Customer checkout/QR
- Admin console
- Developer API

The experience layer never directly performs blockchain or regulated payment operations. It calls the payment core through stable APIs.

## Payment core

Responsibilities:
- Payment-intent orchestration
- Quote locking and expiry
- Payment-method routing
- State transitions
- Refund orchestration
- Idempotency
- Webhook/event normalization

The payment core owns payment state, not custody.

## Ledger and treasury

Responsibilities:
- Economic event journal
- Merchant transaction history
- Fees
- Settlement obligations
- Refund entries
- Treasury preference storage
- Reconciliation hooks

Money values are stored as integers plus currency/asset metadata.

## External adapters

### Bitcoin adapter
Abstracts address/request generation, chain observation, transaction references, and confirmation policy.

### Counterparty adapter
Abstracts XCP and Counterparty asset metadata, transaction observation, divisibility, and asset transfer references.

### FX adapter
Abstracts quote providers and rate sources. Every quote is timestamped and expiring.

### Card/fiat adapter
Reserved for licensed processors/banking partners. Production PAN/CVV handling must not enter the NEO Counter application boundary unless a compliant architecture is separately approved.

## Logical flow

```text
POS / Checkout
      |
      v
Payment Intent API
      |
      +--> Quote Engine
      |
      +--> Rail Router
               |
        +------+------+
        |             |
      Bitcoin      Counterparty
        |             |
        +------+------+
               |
          Event Normalizer
               |
          Payment State
               |
          Ledger Journal
               |
          Settlement View
```

## Suggested service boundaries

- `merchant-service`
- `catalog-service`
- `order-service`
- `payment-core`
- `quote-service`
- `bitcoin-adapter`
- `counterparty-adapter`
- `ledger-service`
- `settlement-service`
- `receipt-service`
- `risk-service` (future)
- `card-program-service` (future/provider-backed)

## Event examples

- `order.created`
- `payment_intent.created`
- `quote.created`
- `payment.detected`
- `payment.confirmed`
- `payment.settled`
- `payment.failed`
- `refund.created`
- `refund.settled`

## Tenant isolation

Every merchant-owned record must carry a merchant identifier and be access-controlled at the data layer. Employee/location access must be scoped by merchant and role.

## Base44 role

Base44 provides the initial standalone application surface and rapid application workflow. Core payment interfaces must remain portable so the system can later move high-assurance services into dedicated infrastructure without rewriting the merchant experience.
