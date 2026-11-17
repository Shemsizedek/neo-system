# NEO Accounting Integration Architecture

Status: implementation specification — Gate 003 adapter scaffolding

## Purpose

Establish NEO as the canonical accounting evidence and double-entry ledger environment. Airwallex is an external accounting-dimension reference and potential supporting-document destination; it is not treated as NEO's general ledger or as the authority for blockchain ownership.

## System boundaries

- **TokenScan / Counterparty:** read-only asset metadata and Counterparty protocol observations. Asset supply, issuer metadata, and lock flags are not wallet balances or proof of beneficial ownership.
- **NEOscan / Bitcoin:** read-only Bitcoin address observations and Counterparty address balances. Transaction history, UTXO evidence, wallet-control evidence, and historical snapshots must be separately represented.
- **NEO Bank / CES:** read-only CES balance and transaction snapshots through the existing adapter/authorized ingestion path. No writeback or transfer authority.
- **NEO Ledger:** canonical immutable source-event registry, account mapping, balanced journal engine, reconciliation and reporting. This is the accounting system of record.
- **Airwallex:** read-only retrieval of accounting fields and field values used by Airwallex Spend. Those values can carry NEO cross-reference identifiers (legal entity, project, cost center, source system, treasury wallet and accounting period) where configured by an authorized Airwallex administrator.

## Airwallex API scope

The adapter uses:
- `POST /api/v1/authentication/login` only to exchange server-side Client ID/API key credentials for a short-lived bearer token.
- `GET /api/v1/accounting/accounting_fields`
- `GET /api/v1/accounting/accounting_fields/{id}`
- `GET /api/v1/accounting/accounting_field_values`
- `GET /api/v1/accounting/accounting_field_values/{id}`

No Airwallex create/update endpoints are implemented. The authentication POST does not create a financial record. Configure an Airwallex scoped API key with read-only permissions for the required accounting-field resources. Credentials must remain in server-side secrets and must never enter Git, browser bundles, logs, snapshots, or public Pages.

The accounting-field and accounting-field-value endpoints are documented as beta and support custom Spend dimensions. They do not, on their own, provide a general ledger, journal posting, bank statement ingestion, or balance certification.

## Adapter contract

Every source adapter must:
1. Expose a read-only status.
2. Preserve source identifiers and raw source payloads where appropriate.
3. Preserve observation timestamps, source URL, retrieval time and provenance.
4. Distinguish source-observed metadata from independently verified ownership or control.
5. Preserve native units and decimal precision as strings or exact integer units.
6. Fail closed on malformed or mismatched source responses.
7. Never sign, broadcast, transfer, create accounting field values, or post journal entries.

## Canonical event and accounting model

Each imported event should be stored with at least:
- `event_id` (NEO-generated immutable identifier)
- `source_system` and `source_record_id`
- `source_event_type`
- `observed_at` and `ingested_at`
- `account_or_wallet_reference`
- `asset_id`, `native_unit`, `native_amount`
- `transaction_hash` / protocol reference when available
- `source_payload_hash`
- `provenance` and `verification_status`
- `accounting_period`
- `reconciliation_status`

Journal entries must reference source events and use debit/credit lines that balance within each currency/unit. Cross-asset valuation requires an explicit rate, source, timestamp, valuation method and approval; unlike units must never be summed directly.

## Required accounting distinctions

- Issued token supply != circulating supply != treasury holdings.
- Asset issuer != current holder != beneficial owner != wallet controller.
- Public wallet balance != legal ownership or custody evidence.
- Historical transfer != current holding.
- Market quote != realized value or cash proceeds.
- CES account balance != BTC reserve.
- Projected income != earned/realized income.
- Unreconciled observations != certified balances.

## Airwallex field mapping convention

Use Airwallex custom fields only as dimensions/cross-references, not as a substitute for NEO's chart of accounts.

| NEO dimension | Airwallex custom-field label suggestion | NEO canonical value |
|---|---|---|
| Legal entity | NEO Legal Entity | stable entity code |
| Project | NEO Project | project ID |
| Cost center | NEO Cost Center | cost-center code |
| Source system | NEO Source | TOKENSCAN / BITCOIN / COUNTERPARTY / CES |
| Treasury wallet | NEO Wallet Reference | public wallet identifier or internal alias |
| Accounting period | NEO Period | YYYY-MM |

Airwallex supports up to 20 custom fields named `Custom field 1` through `Custom field 20`. Actual field creation and value creation are outside this read-only integration gate and require an authorized operator.

## Gate exit criteria

Gate 003 is not complete until:
- TokenScan metadata adapter has passed tests and live read-only source verification.
- Bitcoin/Counterparty and CES adapters have passed current runtime checks with source timestamps and error states.
- Airwallex sandbox authentication and GET-only accounting-field retrieval have passed using scoped read-only credentials.
- Secrets are configured server-side and absent from repository history and public build artifacts.
- Adapter outputs pass provenance, unit, precision and no-writeback tests.

Gate 004 begins only after Gate 003 evidence is reviewed. No financial statement certification is authorized by this specification.
