# NEO Counter Payment Rails

## Principle

NEO Counter treats every payment network as a rail behind a normalized payment-intent interface. Checkout remains consistent while settlement behavior varies by rail.

## Bitcoin

Unit handling:
- canonical internal integer: satoshis
- UI may display BTC

Prototype flow:
1. create payment intent
2. request quote if display currency differs from BTC
3. generate Bitcoin payment request
4. display QR
5. detect transaction reference
6. apply confirmation policy
7. settle ledger event

Production custody/private-key signing is outside v0.1.

## Counterparty XCP and assets

Asset record must include:
- asset name
- divisibility
- canonical quantity
- issuer/source metadata when available
- network identifier

Prototype flow:
1. create payment intent
2. select XCP or Counterparty asset
3. resolve divisibility metadata
4. create quoted asset quantity
5. display destination/payment request
6. simulate or observe transaction
7. normalize transaction reference
8. settle ledger event

## Fiat currencies

NEO Counter may display and quote world currencies, but actual acceptance, custody, conversion, payout, and money transmission depend on supported providers and jurisdiction.

Internal fiat values use integer minor units where a currency defines them. Currency metadata must define exponent/precision rather than assuming two decimals globally.

## Card networks

Card acceptance is modeled as a provider-backed rail.

NEO Counter must prefer tokenized processor references and hosted/SDK card-entry components. Production PAN and CVV data should not traverse or persist in the application unless a separately approved PCI-compliant architecture requires it.

## Cash/manual tender

Cash/manual tender records an order as externally paid. It produces ledger/reporting events but no external settlement event.

## Rail interface

A rail adapter should expose operations conceptually equivalent to:

```ts
interface PaymentRail {
  createRequest(input: PaymentRequestInput): Promise<PaymentRequest>;
  getStatus(reference: string): Promise<PaymentStatus>;
  cancel?(reference: string): Promise<void>;
  refund?(input: RefundInput): Promise<RefundResult>;
}
```

## Confirmation policy

Confirmation requirements are policy, not hard-coded protocol assumptions. Low-value merchant payments may use a different risk policy from high-value settlement.

## Reconciliation

Every external reference must map to one internal payment intent. Reconciliation jobs compare provider/chain events to ledger state and surface mismatches rather than silently correcting historical entries.
