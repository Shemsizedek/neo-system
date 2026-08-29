# Nibiru Reserve System — Origin Architecture

Nibiru Reserve is the translation and reconciliation layer connecting NEO Tokenworks, NEO Banks, Community Exchange System (CES) accounting, Bitcoin/Counterparty settlement observations, and ISO 20022-aligned financial messages.

## Accurate claim boundary

Nibiru can make a **service workflow and its messages** conform to an applicable ISO 20022 schema and usage guide after validation. It does not make Bitcoin itself “ISO 20022 compliant,” certify a coin, create access to SWIFT/FedNow/Fedwire, or confer banking authority.

ISO 20022 provides a common methodology and repository for financial message definitions. Each rail may restrict the global schema through its own usage guidelines. A canonical Nibiru mapping is therefore only the first stage:

1. Nibiru canonical data model.
2. Exact message definition and version, such as pain.001 or pacs.008.
3. XML or approved JSON serialization.
4. XSD/JSON Schema validation.
5. Rail-specific usage-profile validation.
6. KYC, sanctions, fraud, Travel Rule, authorization, and operational controls.
7. Transmission through an institution that is actually entitled and connected to the rail.

ISO 20022 can carry rich compliance information. It does not perform KYC/AML or satisfy the Travel Rule merely because fields exist.

## Virtual-dollar boundary

A CES unit labelled USD is not automatically a U.S. dollar, bank deposit, stablecoin, reserve asset, insured balance, or redeemable claim. Nibiru records it as a CES accounting position until the legal obligation, issuer, redemption terms, backing, custody, and reconciliation evidence are established.

The Origin snapshot therefore reports:
- CES position totals;
- linked but unreconciled blockchain settlement references;
- no reserve attestation;
- no recognized liabilities;
- no claim of legal-tender status.

## Ports

| Port | Origin state |
|---|---|
| CES read | Existing `neo.ces.adapter.v1` bound; runtime credentials still required |
| CES writeback | Disabled |
| Counterparty observation | Settlement-reference linkage |
| Transaction compose/sign/broadcast | Disabled |
| ISO canonical mapping | Enabled |
| ISO XML | `pain.001.001.13` generation enabled |
| ISO validation | Structural checks enabled; official XSD and rail profile pending |
| SWIFT/FedNow/Fedwire | Not connected |
| NEO Tokenworks/NEO Banks | Registered consumers/components |

## API

- `GET /health`
- `GET /api/v1/nibiru/capabilities`
- `GET /api/v1/nibiru/reserve-snapshot`
- `GET /api/v1/nibiru/trial-balance`
- `POST /api/v1/nibiru/ces/positions`
- `POST /api/v1/nibiru/ces/positions/:id/blockchain-settlement`
- `POST /api/v1/nibiru/iso20022/payment-envelopes`
- `GET /api/v1/nibiru/iso20022/payment-envelopes/:id/xml`

## Production gates

1. Define unit issuers, obligations, redemption rules, and ledger authority.
2. Promote memorandum CES postings to recognized liabilities only after that authority is established.
3. Add segregated backing-asset accounts and independent attestations.
4. Integrate Counterparty Core v2 with confirmation and reorg reconciliation.
5. Load the official `pain.001.001.13` XSD and validate generated XML against it.
6. Obtain the target rail's usage guide and readiness-portal validation.
7. Complete BSA/AML, sanctions, Travel Rule, privacy, custody, money-transmission, deposit, stablecoin, lending, and securities analysis.
8. Add independent reserve attestation; never calculate backing from token price alone.
