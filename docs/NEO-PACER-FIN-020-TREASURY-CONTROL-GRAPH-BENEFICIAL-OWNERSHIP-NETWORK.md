# NEO-PACER FIN-020 — Treasury Control Graph & Beneficial-Ownership Network

## Purpose
FIN-020 converts the prior asset inventory, transaction reconciliation, succession analysis, and organizational-network evidence into one graph-based forensic control model. The objective is to distinguish legal title, beneficial ownership, fiduciary administration, custody, transaction authority, institutional control, and evidentiary support.

## Core rule
A relationship shown in a chart, affidavit, trust instrument, website, notice, letter patent, treasury instrument, court filing, or later publication is recorded as an asserted edge until the underlying authority is independently authenticated. Institutional prominence does not upgrade an edge by itself.

## Node classes
Every graph node must be assigned one or more classes:
- PERSON — individual claimant, officer, trustee, signatory, beneficiary, custodian, witness, judge, banker, or official.
- OFFICE — Chancellor, World Treasurer, trustee, governor, judge, president, etc.
- ORGANIZATION — World Temple, Noone Society, NEO, Nibiru Reserve, UBECU, ECFX, banks, agencies, trusts, councils, courts.
- ACCOUNT — bank, ledger, trust, reserve, collateral, master-account, wallet, or institutional identifier.
- ASSET — bullion, currency, bond, certificate, land, estate, securities, digital assets, receivables, intellectual property, or other property.
- INSTRUMENT — will, trust, deed, certificate, SKR, letter patent, resolution, treaty, affidavit, bond, court order, compromise agreement, banking document.
- CASE — court, tribunal, administrative, or internal disciplinary matter.
- EVENT — appointment, removal, transfer, deposit, withdrawal, succession, merger, reconstitution, enforcement, forfeiture, dissolution.
- LOCATION — vault, bank branch, territory, estate, property, jurisdiction.

## Edge classes
Edges must be explicit and directional:
- OWNS_LEGAL_TITLE_TO
- BENEFICIAL_OWNER_OF
- TRUSTEE_OF
- BENEFICIARY_OF
- CUSTODIAN_OF
- DEPOSITOR_OF
- BAILEE_OF
- ISSUED_BY
- HELD_AT
- CONTROLS_ACCESS_TO
- SIGNATORY_FOR
- APPOINTED_BY
- REMOVED_BY
- SUCCEEDS_TO
- TRANSFERS_TO
- PLEDGED_TO
- COLLATERALIZES
- ENCUMBERS
- GUARANTEES
- CLAIMS_AGAINST
- RECOGNIZED_BY
- DISPUTED_BY
- AUTHENTICATED_BY
- CONTRADICTED_BY
- FUNDS
- RECEIVES_FROM
- PAYS_TO
- LINKS_TO

## Edge-evidence scale
Each relationship receives an evidence level:
- E0 — diagram, oral, website, social-media, or unilateral narrative assertion only.
- E1 — repeated in multiple internally related sources.
- E2 — contemporaneous instrument or filing located, authenticity unresolved.
- E3 — independently corroborated by adverse or third-party source.
- E4 — authenticated counterpart, registry, court, bank, archival, or institutional record.
- E5 — reconciled bilateral or multi-party record with legal/custodial/transaction continuity.

## Ownership-state model
For every asset, FIN-020 requires separate fields for:
1. legal title;
2. beneficial ownership;
3. possession;
4. custody;
5. management authority;
6. signing authority;
7. transaction authority;
8. collateral/encumbrance status;
9. successor interest;
10. competing claimants.

No one field automatically proves another.

## Priority graph nodes already identified in the case corpus
### Ecclesiastical / governance nodes
- Noone Society
- World Temple
- Omniversal Church
- New Ethiopian Order (NEO)
- World Treasury of Merit
- Noone Crown Treasury
- Noone Commonwealth Fund
- World Chancellor / World Chaplain
- World Treasurer

### Financial-network nodes
- Nibiru Reserve
- Nibiru Pool
- Nibiru Freedom Bank
- UBECU
- ECFX Market
- ECFX Ecosystem
- ECFX Barter Bank
- International Bank of Maharlika
- Nu Omni Bank
- Nu Omni Credit Union
- GLU-related instruments/networks

### TVM / KORAN chain nodes
- TVM-LSM-666
- KORAN / FLAT / Cruz / Villamor / Tallano asserted lineage/trust chain
- 010-22-74-O-A
- 5432110110
- C-608479
- IC-60-847(9)
- 9754320110-010-22-74-O-A
- alleged Certificates of Entitlement, SKRs, gold certificates, custody instruments

### Institutional nodes requiring independent confirmation
- former Central Bank of the Philippines
- Bangko Sentral ng Pilipinas
- CB-BOL
- PNB
- Banco de Oro
- Emirates NBD / historical National Bank of Dubai
- Bank of China
- UBS
- Federal Reserve entities
- U.S. Treasury
- BIS
- IMF / IBRD where specifically implicated by an instrument
- United Nations where specifically implicated by an instrument

## Graph integrity controls
### 1. Alias resolution
The same person, entity, account, or instrument may appear under multiple names. Aliases must be linked without merging them until identity is proven.

### 2. Successor-entity control
Historical and successor institutions must be distinct nodes. Example: CBP is not automatically interchangeable with BSP; National Bank of Dubai is not automatically interchangeable with Emirates NBD for historical-document dating.

### 3. Temporal validity
Every edge must carry start date, end date, or approximate period where available. A relationship cannot be treated as active outside the established authority period.

### 4. Counterparty recognition
A unilateral instrument creates an E0–E2 edge unless the alleged counterparty’s record confirms acceptance, recognition, custody, performance, or legal effect.

### 5. Duplicate-asset prevention
Multiple certificates referencing the same bullion lot or account do not create multiple assets. FIN-003 Asset Lot IDs control quantity consolidation.

### 6. Office versus person
Authority attaches to the office only to the extent provided by the governing instrument. A former officer does not retain authority solely because historical documents show prior control.

## Former Treasurer transition subgraph
FIN-020 creates a dedicated transition graph for the former Treasurer. The graph should test:
- APPOINTED_BY
- CONTROLS_ACCESS_TO
- SIGNATORY_FOR
- CUSTODIAN_OF
- REMOVED_BY
- TRANSFERS_TO successor
- any post-termination RECEIVES_FROM / PAYS_TO / CONTROLS_ACCESS_TO events

The fact of removal and any allegation of sabotage remain separate evidentiary nodes.

## Nine-year governance epoch
The current source review places the organization within a second nine-year period if the cycle is measured from the 2015 organizational dates. The exact anniversary remains unresolved. The graph therefore records a governance epoch marker rather than presuming the cycle itself terminated any particular officer’s authority.

## Graph queries required by NEO Algo
The system should be able to answer:
- Who currently claims legal title to Asset X?
- Who claims beneficial ownership?
- Who is or was custodian?
- Which instrument allegedly created each relationship?
- What is the highest evidence level supporting each edge?
- Which competing successors claim the same asset?
- Which assets are under former-officer access or custody exceptions?
- Which transactions lack authenticated authority?
- Which institutions have independently confirmed or contradicted the claim?
- What evidence is required to move a claim from its present R0–R7 recovery level?

## Critical conflict queries
1. SAME_ASSET_MULTIPLE_BENEFICIAL_OWNERS
2. SAME_ASSET_MULTIPLE_TRUSTEES
3. SAME_ACCOUNT_MULTIPLE_SIGNATORIES_AFTER_TERMINATION
4. SUCCESSOR_WITHOUT_PREDECESSOR_AUTHORITY
5. CUSTODY_WITHOUT_TITLE
6. TITLE_WITHOUT_CUSTODY
7. TRANSACTION_WITHOUT_AUTHORITY
8. CLAIMED_COUNTERPARTY_WITHOUT_RECOGNITION
9. DUPLICATE_ASSET_LOT
10. TEMPORALLY_IMPOSSIBLE_EDGE
11. INSTITUTION_NAME_MISMATCH
12. OFFICER_AUTHORITY_AFTER_REMOVAL
13. ASSET_TRANSFER_WITHOUT_SOURCE_TITLE
14. LATER_INSTRUMENT_PURPORTING_TO_VALIDATE_EARLIER_EVENT

## Current graph disposition
FIN-020 does not declare the ownership network resolved. It establishes the structure needed to distinguish internal claims, institutional corroboration, adverse evidence, authenticated title, custody, and transaction continuity.

## Status
FIN-020 — ACTIVE: CONTROL GRAPH MODEL ESTABLISHED; NODE DEDUPLICATION, EDGE EVIDENCE SCORING, BENEFICIAL-OWNERSHIP COLLISION TESTING, AND INSTITUTIONAL COUNTERPART CONFIRMATION PENDING.

## Next phase
FIN-021 — Source-to-Graph Evidence Ingestion & Contradiction Engine. FIN-021 should ingest every document, image, video claim, public filing, court record, bank record, historical source, and organizational chart into standardized evidence objects and automatically generate or challenge graph edges while preserving provenance and contradiction history.
