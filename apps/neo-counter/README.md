# NEO Counter

NEO Counter is the standalone Bitcoin / Counterparty XCP point-of-sale and merchant-services application for the NEO ecosystem.

## Mission

Provide merchants with a unified commerce layer for Bitcoin, Counterparty assets, supported fiat currencies, card-network integrations, QR payments, merchant treasury management, and programmable settlement.

## v0.1 scope

- Merchant onboarding shell
- Product catalog and cart
- Payment-intent lifecycle
- BTC / XCP / Counterparty asset abstractions
- QR checkout
- Transaction ledger
- FX quote interface
- Receipts
- Settlement preferences
- Test/mock payment rails

## Base44 application

Base44 app id: `6a7a25d9783a8c3c7be1b423`

The Base44 application is the initial standalone application surface. This repository is the canonical engineering and architecture source for NEO Counter.

## Safety boundary

v0.1 does not custody production private keys, originate regulated fiat transfers, issue live debit/credit cards, or process production cardholder data. Those capabilities require dedicated security, compliance, banking, card-issuing, and payment-processing integrations.

## Structure

- `docs/BUILD_SPECIFICATION.md` — product and engineering requirements
- `docs/ARCHITECTURE.md` — system boundaries and services
- `docs/PAYMENT_RAILS.md` — BTC/XCP/fiat/card rail model
- `docs/SECURITY_AND_COMPLIANCE.md` — security and regulated-service boundaries
- `src/domain.ts` — initial domain model
- `src/payment-core.ts` — payment-intent prototype
