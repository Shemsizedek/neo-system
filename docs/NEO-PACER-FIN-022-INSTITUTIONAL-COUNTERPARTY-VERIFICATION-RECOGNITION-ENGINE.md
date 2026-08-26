# NEO-PACER FIN-022 — Institutional Counterparty Verification & Recognition Engine

## Purpose
FIN-022 tests whether a claimed relationship, account, custody arrangement, trust, title, obligation, transaction, appointment, judgment, certificate, reserve position, settlement right, or succession interest is recognized by the institution alleged to be the counterparty, issuer, custodian, registry, court, government, bank, central bank, clearing system, trustee, or international organization.

The engine is designed to distinguish internal or claimant-side documentation from external institutional recognition.

## Core Rule
A source naming an institution does not establish that institution’s participation.

Recognition requires institution-side or otherwise independently competent evidence tied to the exact proposition being tested.

## Counterparty Verification Object
Each claimed institutional relationship becomes a Counterparty Verification Object containing:
- `verification_id`
- `institution_name`
- `institution_type`
- `jurisdiction`
- `claimed_relationship`
- `claimant_or_source_party`
- `asset_or_account_identifier`
- `instrument_identifier`
- `transaction_identifier`
- `date_or_period`
- `claimed_signatory_or_official`
- `claimed_capacity`
- `source_evidence_ids`
- `institution_side_evidence_ids`
- `recognition_status`
- `response_status`
- `record_location`
- `successor_institution`
- `legal_effect_notes`
- `contradictions`
- `next_required_evidence`

## Recognition Scale
- `RCO-0` — unilateral assertion only
- `RCO-1` — institutional name/identifier appears in source; no counterparty evidence
- `RCO-2` — independent evidence confirms institution existed/could perform the function
- `RCO-3` — institution-side record acknowledges the person, instrument, matter, account, case, or relationship
- `RCO-4` — institution-side record confirms the material terms or transaction
- `RCO-5` — institution-side record plus ledger/registry/custody/judicial continuity confirms legal or financial effect

Silence, nonresponse, delivery of notice, or possession of a receipt is not automatically RCO-3 or higher.

## Response Classes
Institutional responses are classified as:
- `CONFIRMED`
- `PARTIALLY_CONFIRMED`
- `NO_RECORD_FOUND`
- `DENIED`
- `DECLINED_TO_CONFIRM`
- `RECORDS_UNAVAILABLE`
- `RECORDS_TRANSFERRED_TO_SUCCESSOR`
- `RECORDS_ARCHIVED`
- `REQUIRES_AUTHORIZATION`
- `REQUIRES_COURT_OR_LEGAL_PROCESS`
- `PENDING`
- `NO_RESPONSE`

A `NO_RECORD_FOUND` response is adverse evidence but does not automatically establish falsity where records may have been transferred, destroyed, retained under another name, held by an affiliate, or maintained outside the searched period.

## Priority Institution Classes
FIN-022 applies to:

### Philippine institutions
- former Central Bank of the Philippines
- Bangko Sentral ng Pilipinas
- Central Bank–Board of Liquidators
- Philippine National Bank
- Banco de Oro / BDO and predecessors
- Land Registration Authority / Registry of Deeds
- Philippine courts and Supreme Court archives
- Commission on Audit
- Malacañang / presidential archives
- relevant ministries, agencies, and national archives

### United States institutions
- U.S. Department of the Treasury
- Federal Reserve Board
- Federal Reserve Bank of New York and other Reserve Banks where specifically implicated
- National Archives and Records Administration
- courts and PACER-accessible federal dockets
- State Department and presidential libraries where relevant
- county/state registries for property and corporate records

### International and foreign institutions
- Bank for International Settlements
- International Monetary Fund
- World Bank / IBRD
- United Nations and archival offices
- Bank of China and relevant predecessors/branches
- UBS and predecessors
- National Bank of Dubai / Emirates NBD
- other banks named in certificates, SKRs, ledgers, videos, charts, affidavits, or claimant materials

### Market and settlement infrastructure
- DTCC and relevant subsidiaries
- securities depositories
- registrars, transfer agents, custodians, exchanges, clearing houses, and payment systems where specifically implicated

## Verification Questions
For each institution ask only proposition-specific questions:
1. Did the institution exist under that name on the relevant date?
2. Did the relevant branch, department, court, registry, or office exist?
3. Did the named officer hold the claimed position?
4. Did that officer possess authority over the subject matter?
5. Does the institution recognize the instrument number, account number, certificate, case, docket, trust, ledger entry, security, title, or transaction?
6. Does an original or certified counterpart exist in institutional files?
7. Is there a ledger, vault, custody, registry, court, board, minute-book, accounting, or transaction entry matching the claim?
8. Was the item transferred to a successor institution?
9. Was it closed, discharged, liquidated, cancelled, pledged, blocked, forfeited, superseded, or otherwise altered?
10. What present entity, if any, holds the corresponding record or obligation?

## Court and Registry Recognition
For judicial/title claims, recognition requires more than a circulating copy.

The engine tests:
- docket existence
- filing date
- assigned judge/branch/division
- minute-book or rollo entry
- clerk certification
- promulgation/service record
- finality/entry of judgment
- appellate history
- writ issuance
- enforcement history
- title registry annotation or transfer

A court document may be authentic yet later vacated, stayed, enjoined, reversed, superseded, or unenforceable.

## Banking and Custody Recognition
For banking, bullion, reserve, certificate, or trust claims, verify:
- account holder/counterparty identity
- account or instrument number
- opening date
- account type
- currency or asset class
- custody location
- asset lot or bar list where applicable
- quantity/fineness/assay
- encumbrances or pledges
- authorized signatories
- transaction ledger
- transfer/release history
- closure/current status

A certificate or SKR does not independently prove present ownership, current balance, or unencumbered custody.

## Successor Institution Rule
Where institutions have merged, dissolved, reorganized, or transferred assets/liabilities, FIN-022 must trace:

`original institution → statutory/contractual succession event → transferred records/assets/liabilities → successor entity → present custodian`

No automatic successor liability is presumed merely because a newer institution replaced an older one generally.

## Notice vs Recognition
FIN-022 expressly distinguishes:
- sent
- delivered
- received
- docketed
- acknowledged
- investigated
- accepted
- contractually agreed
- judicially recognized
- financially performed

A delivered notice proves delivery when authenticated. It does not prove agreement with the legal or factual assertions contained in the notice.

## Negative Evidence Protocol
Adverse institutional evidence must be preserved and tested, not discarded.

When an institution denies a claim or reports no record:
1. capture the exact search scope used by the institution;
2. determine whether aliases, predecessor names, alternate account formats, branches, or dates were searched;
3. determine record-retention limitations;
4. check successor and archival repositories;
5. compare the denial with claimant-side originals;
6. classify the resulting graph effect as `WEAKEN`, `CONTRADICT`, or `NO EFFECT` depending on competence and scope.

## Conflict and Interest Controls
Institutional records are not treated as infallible. Where an institution may have a direct financial, litigation, regulatory, or reputational interest in the disputed matter, the evidence is still admitted but tagged for conflict analysis. Independent records, audits, court filings, regulators, archival copies, counterparties, and third-party custody records should be used to test the institution’s position.

Institutional prominence does not create evidentiary supremacy.

## External Recognition of Internal NEO / World Temple Instruments
For Noone Society, World Temple, NEO, Nibiru, NOMNI, UBEC, ECFX, and related materials, FIN-022 distinguishes:
- internal organizational validity under the issuing body’s own authenticated governance records;
- delivery or publication to an external institution;
- external acknowledgment;
- external contractual acceptance;
- external regulatory, judicial, banking, registry, or custodial recognition.

These are separate propositions.

## TVM / KORAN Verification Queue
Priority counterparty tests include:
- `TVM-LSM-666`
- `010-22-74-O-A`
- `IC-60-847(9)`
- `C-608479`
- `5432110110`
- claimed Certificate of Entitlement records
- claimed SKRs and Gold Certificates
- alleged Central Bank of the Philippines deposits/custody
- alleged Allied Nations trust deposits
- BMBSA counterpart records
- claimed international-bank bullion accounts
- alleged federal/Treasury/Federal Reserve identifiers

Each identifier must be tested against the alleged issuer/custodian’s own numbering, archive, ledger, or registry system.

## Institutional Verification Packet
For each high-priority claim generate a packet containing:
1. exact claimant proposition;
2. exact instrument/page/identifier;
3. date and named official;
4. copy of instrument where appropriate and lawful;
5. narrow verification questions;
6. aliases/predecessor/successor entities;
7. requested record classes;
8. preservation request where appropriate;
9. response log;
10. graph update recommendation.

The packet should avoid asserting disputed facts as already adjudicated when asking a counterparty to verify them.

## Evidence Escalation
Suggested progression:

`claimant source → independent historical/institutional capacity check → institution-side acknowledgment → authenticated counterpart record → ledger/registry/judicial continuity → present-status confirmation`

Only claims reaching the later stages should be considered for higher recovery-readiness classifications in FIN-008/ECC-008.

## Output Registers
FIN-022 generates:
- Institutional Counterparty Matrix
- Recognition Status Register
- Successor Institution Map
- Verification Request Queue
- Response and Nonresponse Log
- Negative Evidence Register
- Institutional Conflict-of-Interest Tags
- Counterparty-Confirmed Graph Edge Register
- Counterparty-Contradicted Graph Edge Register
- Missing Institutional Record Queue

## Initial Priority Order
1. CBP / BSP / CB-BOL records tied to specific TVM/KORAN identifiers
2. Philippine court/registry records tied to 3957-P and asserted title consequences
3. U.S. Treasury / Federal Reserve identifier verification
4. BIS relationship verification
5. PNB / BDO / Bank of China / UBS / National Bank of Dubai or successor records
6. UN / IMF / World Bank archival propositions tied to alleged collateral arrangements
7. Manhattan property and corporate/title counterpart records
8. DTCC/market-infrastructure relationships shown in Wade/organizational charts
9. external recognition of NEO/World Temple/Nibiru/NOMNI instruments

## Status
FIN-022 — ACTIVE: INSTITUTIONAL COUNTERPARTY, SUCCESSOR, RECOGNITION, NEGATIVE-EVIDENCE, AND RESPONSE-CLASSIFICATION RULES ESTABLISHED. CLAIM-SPECIFIC VERIFICATION PACKETS AND COUNTERPARTY RESPONSES REMAIN TO BE POPULATED.
