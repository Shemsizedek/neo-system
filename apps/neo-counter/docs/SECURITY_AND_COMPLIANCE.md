# NEO Counter Security and Compliance Boundaries

## Security principles

- Never commit secrets, seed phrases, private keys, API credentials, PANs, CVVs, or recovery material.
- Separate merchant identity, payment state, ledger state, and external provider credentials.
- Use least-privilege access for employees, administrators, services, and provider tokens.
- Require idempotency for payment mutations and webhook processing.
- Maintain immutable audit references for payment state changes.
- Encrypt sensitive data in transit and at rest where applicable.
- Treat external webhook payloads as untrusted input and verify authenticity.

## Key-management boundary

The v0.1 prototype is non-custodial/mock by design. Production signing or custody requires a dedicated key-management architecture such as HSM/MPC/hardware-wallet or qualified custody integrations, plus operational controls and recovery procedures.

## Card-data boundary

Production card acceptance should use tokenized provider SDKs/hosted components so NEO Counter stores provider tokens rather than raw cardholder data. PCI scope must be assessed before any production launch.

## Fiat and money-transmission boundary

Displaying prices and FX quotes is not the same as being authorized to receive, hold, convert, or transmit regulated fiat funds. Live fiat features must be enabled only through appropriate banking/payment partners and jurisdiction-specific compliance review.

## Credit and debit products

NEO-branded debit or credit cards are treated as future partner-backed card-program capabilities. Issuing, underwriting, servicing, consumer disclosures, adverse-action processes, AML/KYC, sanctions screening, and network rules must be implemented with appropriate regulated partners before launch.

## AML/KYC and sanctions

The platform architecture must provide extension points for merchant/customer verification, transaction monitoring, sanctions screening, case management, and recordkeeping where legally required. v0.1 does not claim these controls are production-complete.

## Audit logging

Record at minimum:
- actor/service
- merchant
- action
- object type/id
- before/after state reference where applicable
- timestamp
- request/correlation id
- external provider reference

Audit records should be append-oriented and protected from ordinary merchant edits.

## Incident-readiness baseline

Before production funds are handled, establish:
- credential rotation
- alerting
- access review
- backup/restore
- incident response
- fraud/risk escalation
- reconciliation failure handling
- chain/provider outage behavior
