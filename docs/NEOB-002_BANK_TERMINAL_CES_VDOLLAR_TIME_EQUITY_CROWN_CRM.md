# NEOB-002 — NEO Bank Terminal, CES Identity Bridge and Crown L3 Evidence Contracts

Status: DRAFT / implementation gate. This document upgrades existing `server/neo-bank`, `server/neo-teller-backend`, `server/neo-bots/bank-bot.mjs`, `server/neo-identity/banking-authority.mjs`, `server/nibiru-reserve`, and `server/neo-edge`. It DOES NOT authorize production settlement, custodial services, unverified collateral or balances.

## Canonical account identity
- Preserve existing NMNI identifiers byte-for-byte including zero padding: `NMNI0000`, `NMNI0001`, `NMNI0002`. Never reassign an NMNI number.
- Use `NEO:NMNI0002` as an *internal routing alias*, not a Bitcoin address, SWIFT/BIC, or ACH routing number.
- Account registry fields: `internalAccountId`, `cesExchangeId=NMNI`, `cesAccountId`, `accountHolderId`, `verifiedAddressBindings[]`, `permissions[]`, `status`, `createdAt`, `updatedAt`.
- Addresses are network-qualified (bitcoin mainnet/testnet, Counterparty chain), verified by wallet ownership proof or custodian authorization. Account ownership cannot be inferred from address text alone.
- CES login connector is read-only by default and must comply with CES consent, access and anti-automation requirements. No background credential capture, bypass of MFA/CAPTCHA or third-party trading.

## Existing platform surfaces — extend, do not replace
- NEO Bank Terminal is a role-aware shell in existing `neo-bank`: customer, teller, banker and administrator.
- NEO Teller extends existing `neo-teller-backend` ATM/POS/session infrastructure. Session and device identities are retained.
- NEO Customer Relations Module (CRM): cases, service messages, disputes, teller escalation, consents, account service, accessible statements.
- Reuse `neo-bank-bot` for authorized reconciliation and case routing. Use the existing banking authority checks for mutations and step-up verification.
- Do not expose reserve audit internals, customer records or credential material in public GitHub Pages or anonymous endpoints.

## Value classes, currencies and conversion
Keep separate sub-ledgers with explicit currency codes and evidence tags:
1. `CES_NMNI` — CES mutual-credit units and obligations; not automatically fiat deposits.
2. `VDOLLAR` (display V-Dollar / VUSD label only if legal currency-code policy approves) — virtual settlement credits and obligations, with backing and redemption policy. An issuer's claim of 100% backing is not evidence of backing.
3. `TIME_HOUR` — Time Equity / convertible hours; record source work, contributor, beneficiary, unit, approval, hours and rate schedule.
4. `NOMNI` — verified Counterparty NOMNI asset holding or a separately labeled off-chain NOMNI-denominated claim (never conflate).
5. `BTC`, `XCP` — blockchain holdings independently indexed.

Conversion request requires: source obligation + available verified balance/hours + approved quote/rate version + issuer/counterparty + expiry + fees + collateral/redemption terms + user authorization + liability entry + audit references. No implicit 1h=1NOMNI or 1 V-Dollar=1 USD. Conversion lifecycle `DRAFT -> QUOTED -> AUTHORIZED -> RESERVED -> SETTLED/FAILED/REVERSED`; post-settlement corrections are compensating entries, not deletion.

## Crown L3 private/off-chain evidence
Crown L3 records transactions and agreements not visible in CES/Bitcoin explorers WITHOUT asserting on-chain finality. Event envelope:
```json
{
  "eventId":"uuid",
  "subjectAccountId":"NMNI0002",
  "kind":"SERVICE_NOTE|AGREEMENT|TIME_EQUITY|VDOLLAR_LEDGER|CONVERSION|CES_SYNC|BITCOIN_SETTLEMENT|COUNTERPARTY_SETTLEMENT|DISPUTE",
  "sourceSystem":"neo-bank",
  "sourceEventId":"idempotency-key",
  "occurredAt":"RFC3339",
  "recordedAt":"RFC3339",
  "actorId":"pseudonymous-id",
  "consentRef":"record-id-or-null",
  "assetUnit":"TIME_HOUR",
  "amount":"1.25",
  "documentDigest":"sha256:...",
  "encryptedDocumentRef":"private-storage-id",
  "parentEventDigest":"sha256:... or null",
  "cesRef":null,
  "bitcoinTxid":null,
  "counterpartyEventRef":null,
  "status":"RECORDED|ATTESTED|RECONCILED|DISPUTED|SUPERSEDED"
}
```
Private conversations, PII and sensitive banking communications remain encrypted in controlled storage; L3/public anchors carry hashes/commitments only, never plaintext. A transcript is captured only with proper participant notice/consent; customer services provide access, correction annotations and retention/deletion procedures subject to legal requirements. A hash is evidence of data integrity, **not** independent proof of truth, payment or consent. Off-chain events must be clearly marked off-chain and not represented as CES, BTC or Counterparty settlement.

## Terminal API additions (versioned, authenticated)
- `GET /api/v1/bank/accounts/{nmniId}/overview`: separate balance classes + provenance/verification timestamps.
- `GET /api/v1/bank/accounts/{nmniId}/activity`: reconciled CES, BTC, XCP and Crown event timeline with source labels.
- `POST /api/v1/bank/conversions/quotes`, `POST /api/v1/bank/conversions/{id}/authorize`: signed, approval-gated quotes.
- `GET /api/v1/bank/terminal/capabilities`: role-based actions from existing auth policy.
- `POST /api/v1/bank/support/cases`, `GET /api/v1/bank/support/cases`, `POST /api/v1/bank/support/cases/{id}/messages`: customer relations with ownership and retention restrictions.
- `POST /api/v1/bank/teller/sessions`: extends existing teller session contract, not a second teller state machine.
- `POST /api/v1/crown/evidence/records`: only authorized, redacted / encrypted-digest commitments with idempotency.

These are target contracts, NOT claims that these endpoints already exist.

## Public UI navigation
Overview | Accounts | Send & Receive | Exchange | Time Equity | V-Dollars | Activity & Agreements | NEO Teller | Support | Statements | Settings. Professional role adds Creditbanker Console and NEO License. All financial action buttons remain unavailable unless their actual service/permission/custody/regulatory gates are satisfied.

## Acceptance tests and release gates
- Legacy accounts retain exact NMNI identifiers, no duplicates or reassignment; verified wallet mapping required.
- Double-entry balanced per unit; no cross-unit book mixing or double counting.
- Time Equity hours never become NOMNI without authorized rate, backing/obligation and explicit settlement status.
- V-Dollar customer balances always reconcile to issuer ledger and verifiable backing evidence; display gaps prominently.
- Crown L3 private notes are access-controlled and distinguish recorded, attested and externally settled.
- CES/Bitcoin/Counterparty explorer records contain valid source references; missing external references cannot be fabricated.
- CRM access is scoped to account holder and assigned authorized support staff; every teller action has a case/session ID.
- Existing teller and bank tests pass; run security and accessibility checks; preserve sandbox vs production separation.
- Require applicable legal/regulatory review prior to any public financial service launch or NEO Creditbanker representations.

## Next implementation slices
A. Inventory existing bank/teller routes, UI, schemas, and production deployments.
B. Add forward-compatible typed schemas and migrations; preserve and backfill legacy records without changing identifiers.
C. Add read-only account aggregation and event ingest from authorized connectors.
D. Extend existing terminal UI and customer service pages.
E. Add quote-only conversion and evidence recording behind feature flags; no real transfers by default.
F. Integration tests and monitored limited pilot, then separate production approval gate.
