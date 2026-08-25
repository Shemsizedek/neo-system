# NEO-PACER FIN-003 — Quantity & Bullion Reconciliation

**Case:** NEO-2026-GLOBAL-0001 — TVM-LSM-666 v. NEO-LPS-999

## Scope
FIN-003 tests whether asserted bullion quantities in the claimant corpus can represent distinct physical gold lots, duplicated certificates, monetary/accounting units, collateralized claims, or incompatible quantities.

## Controlling external benchmark
Current World Gold Council estimates place total above-ground gold at approximately **220,700 metric tonnes at end-2025**, with roughly **38,600 tonnes** held by central banks and other official institutions. Annual global mine production in 2025 was approximately **3,672–3,815 tonnes**, depending on revision set.

These figures do not by themselves disprove a historical asset claim. They are a physical-scale control used to test whether a claimant quantity can plausibly represent physical bullion as stated.

## Asserted quantities requiring lot-by-lot reconciliation
The claimant corpus has included or referenced figures such as:
- 1,715,000 metric tonnes associated with China / 1952 narrative
- 217,000 metric tonnes associated with a 1957 narrative
- 10,000 metric tonnes associated with National Bank of Dubai
- 11,000 metric tonnes associated with Banco de Oro
- 12,000 metric tonnes associated with PNB
- 1,181,336,675 metric tonnes associated with a later Certificate of Entitlement claim

These quantities are preserved as **asserted figures**, not findings of fact.

## Asset-lot doctrine
NEO-PACER shall not sum repeated gold figures automatically. Every claimed quantity receives an Asset Lot ID and must be classified as one of:
1. Original physical deposit
2. Transfer of an existing lot
3. Custody receipt for an existing lot
4. Certificate renewal/reissue
5. Collateralization/encumbrance
6. Beneficial-interest/accounting claim
7. Duplicate narrative/reference
8. Monetary unit or notional value mislabeled as physical tonnes
9. Independently authenticated distinct physical lot

## Physical-scale tests
A claimed lot stated in physical tonnes must be tested against:
- total estimated gold mined through the claimed date;
- global above-ground stock;
- official-sector reserve totals;
- annual mine production and plausible transport/refining capacity;
- vault, assay, refinery, shipment, insurance and custody records;
- bar counts, fineness, serial ranges and gross/net weight;
- whether the same lot later appears under a different institution or certificate.

### Extreme-quantity flag
The asserted **1,181,336,675 metric tonnes** exceeds the World Gold Council's end-2025 estimate of total gold mined throughout history by more than three orders of magnitude. Until the underlying instrument is authenticated and its unit conventions are established, NEO-PACER classifies this quantity as:

**CRITICAL UNIT / DUPLICATION / PHYSICAL-IMPOSSIBILITY REVIEW REQUIRED**

This does not authorize silent alteration of the source. The stated number remains preserved exactly as asserted.

## Reconciliation keys
Each lot record must contain:
- Asset Lot ID
- asserted owner / beneficiary
- depositor
- custodian
- bank/institution
- date
- weight as written
- original unit
- converted metric-tonne value
- fineness
- bar count
- serial range
- certificate/SKR number
- account/reference number
- source document
- source page
- prior lot reference
- subsequent lot reference
- authentication status
- duplication status
- physical-plausibility status

## FIN-003 disposition
**ACTIVE — PHYSICAL SCALE CONTROL ESTABLISHED / CLAIMED QUANTITIES NOT YET RECONCILED TO UNIQUE AUTHENTICATED LOTS.**

No consolidated bullion total shall be published as a finding until duplicate instruments, transfers, reissues, units and custody continuity are reconciled.

## Priority discovery
1. Complete TVM affidavit quantity extraction by page.
2. Bar lists, assays, serial numbers and refinery stamps.
3. Original CBP/BSP custody ledgers and delivery receipts.
4. PNB, BDO, Bank of China, UBS and Emirates NBD/National Bank of Dubai confirmations.
5. Shipping, customs, insurance and vault movement documentation.
6. Instrument-unit audit for every certificate using the word "ton", "metric ton", "MT", "gold unit", "certificate", "deposit" or "collateral".

## External controls
- World Gold Council, Above-ground stock / How Much Gold Has Been Mined (end-2025 estimate ~220,700 t).
- World Gold Council, Gold Demand Trends 2025 supply data (~3,672 t initial 2025 mine production; later revisions ~3,815 t).
- BIS statutes: BIS gold custody operations are principally for central banks and official monetary institutions, relevant to any later custody-chain claim.
