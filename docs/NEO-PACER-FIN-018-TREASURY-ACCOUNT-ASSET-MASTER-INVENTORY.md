# NEO-PACER FIN-018 — Treasury Account & Asset Master Inventory

## Purpose
Create the authoritative control register for every treasury account, fund, wallet, financial instrument, custody relationship, payment rail, treasury platform, and asset administered or claimed by the Noone Society / World Temple / related treasury architecture.

## Control rule
A named account, fund, bank, wallet, certificate, trust, token, or instrument is not treated as authenticated merely because it appears in a chart, affidavit, notice, bond, or internal ledger. Each item must be reconciled against its source document, current custodian, authority chain, balance or asset evidence, and present access status.

## Master inventory fields
For every treasury item, record:
- Asset/Account ID
- Exact name as appearing in the source
- Alias/acronym
- Entity class: bank / fund / trust / treasury / wallet / reserve / exchange / bond / certificate / bullion lot / account / payment platform / other
- Claimed owner
- Beneficial owner
- Trustee/administrator
- Custodian
- Institution/provider
- Account, certificate, block, index, wallet, routing, or reference number
- Currency or asset class
- Quantity or balance claimed
- Current balance or quantity verified
- Date opened/issued
- Date closed/revoked/transferred
- Authorized signatories
- Digital administrators
- Source instrument
- Source date
- Source location
- External confirmation status
- Current access status
- Reconciliation status
- Chain-of-custody status
- Recovery status under R0-R7
- Notes / contradictions / exceptions

## Initial treasury classes from the source corpus
### Core Noone / World Temple treasury entities
- Noone Commonwealth Fund
- Noone Crown Treasury
- Nu Omni Bank
- Nu Omni Credit Union
- World Treasury of Merit
- World Temple Trust Fund
- Nibiru Reserve Pool
- Nibiru Reserve System
- Nibiru Freedom Bank / Nibiru Freedom
- Nu Omni Central Bank references

### Credit, exchange, and market infrastructure appearing in flow charts
- Universal Barter Exchange Credit Union (UBECU)
- Universal Traffic Exchange Credit Union (UTECU)
- ECFX Barter Bank
- ECFX Market
- ECFX Ecosystem
- ECFX Trading Platform
- FX International
- World Credit Union
- Southern Currency Union
- US Capital Private Bank
- International Bank of Maharlika
- Karamouzi Bank and Trust
- African Finance Regulatory Authority
- Royal GLU Exchange
- Liquid Trade Exchange
- UBECU Trade / UBECUSWAP / associated liquidity-pool structures

### Financial instruments and identifiers already appearing in the case corpus
- TVM-LSM-666
- 010-22-74-O-A
- 010-L-50
- IC-60-847(9)
- C-608479
- 5432110110
- 9754320110-010-22-74-O-A
- Royal Account No. 501.101.357
- Collateral Account No. 103.357.777
- Noone Crown Treasury Consolidated Gold Treasury Bond — 800,000,000,000 Nomni
- Block No. 422310
- Index No. 11936042/3/4
- Gold certificates, gold trust certificates, safekeeping receipts, delivery receipts, bullion certificates, and related custody instruments identified in prior FIN nodes

## Inventory status taxonomy
- CLAIMED — appears in a source but no independent control evidence yet
- SOURCE-CORROBORATED — repeated across two or more internal/claimant sources
- ISSUER-ACKNOWLEDGED — issuer/custodian confirms the instrument/account exists
- BALANCE-VERIFIED — current or historical balance/asset quantity verified from institution-side evidence
- CLOSED — confirmed terminated/closed
- TRANSFERRED — confirmed transferred to another account/custodian
- FROZEN/RESTRICTED — access or disposition restricted by an identifiable authority
- UNRESOLVED — conflicting or incomplete evidence

## Signatory and access controls
For each financial relationship record:
- Primary signer
- Secondary signer
- Required number of signatures
- Delegated authority limit
- Online administrator
- MFA method
- Recovery contact
- Device/token/hardware key
- API or integration credentials
- Date access last verified
- Date former officers were removed
- Date replacement officers were added

Sensitive secrets, seed phrases, private keys, passwords, and full authentication tokens must never be stored in this repository. Store only status, custody location, and controlled-reference metadata.

## Transition reconciliation
FIN-018 inherits the FIN-017 requirement to reconcile treasury authority across the administrative transition. Each item must show whether the former Treasurer had access, whether that access was removed, whether the successor received control, and whether the item has been fully reconciled.

Required transition fields:
- Former Treasurer access: YES / NO / UNKNOWN
- Access termination date
- Successor access date
- Last statement/ledger date before transition
- First statement/ledger date after transition
- Unexplained balance difference
- Unexplained transaction count
- Missing records
- Open exceptions

## Asset classes requiring separate valuation controls
Do not combine unlike assets into one total without normalization. Maintain separate totals for:
- fiat currency
- bullion by metal and fineness
- digital assets
- internal token/credit units
- negotiable instruments
- bonds
- certificates
- land/real property
- receivables
- trust interests
- pledged/collateralized assets
- restricted or disputed assets

## Duplicate-asset control
One certificate does not equal one new asset. One account reference does not equal one independent balance. One transfer does not create new value. Every asset must be mapped to a unique Asset Lot or Financial Claim ID and checked against FIN-003 duplicate-asset rules.

## Current priority queue
1. Establish which treasury entities are currently active.
2. Identify every live external financial institution or service provider.
3. Confirm present signatories and administrators.
4. Revoke residual former-officer access.
5. Obtain statements and transaction exports for all active accounts.
6. Reconcile balances through the transition window.
7. Link each instrument and claim identifier to the exact source file and issuing/custodial institution.
8. Flag any orphaned account, wallet, instrument, or credential.
9. Segregate disputed assets from operating funds.
10. Produce a current Treasury Control Certificate once the inventory reaches verified status.

## Current finding
The case corpus identifies a broad treasury architecture spanning internal funds, banking entities, reserve structures, exchange/credit systems, bullion instruments, cryptographic instruments, and historical account identifiers. The present record is sufficient to create an inventory framework but not sufficient to certify current balances, ownership, or access for every item.

## Status
FIN-018 — ACTIVE: MASTER TREASURY INVENTORY ESTABLISHED / ENTITY STATUS, CURRENT BALANCES, SIGNATORY AUTHORITY, CUSTODY, ACCESS, AND TRANSITION RECONCILIATION PENDING ITEM-BY-ITEM VERIFICATION.

## Next phase
FIN-019 — Treasury Transaction Reconciliation & Exception Ledger: reconstruct cash, credit, bullion, token, and instrument movements across each authenticated account and identify duplicates, unexplained transfers, missing records, unauthorized activity, and unresolved custody events.
