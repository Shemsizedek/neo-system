# NEO-PACER FIN-026 — Primary Records Acquisition Tracker & Evidence Intake Ledger

## Purpose
FIN-026 is the operational ledger for evidence targeted under FIN-025. It records each request, acquisition, response, refusal, certified record, archive hit, missing-record response, audiovisual source, internal record, and other evidentiary intake event from acquisition through FIN-021 ingestion.

The objective is auditability: NEO-PACER must be able to establish what was sought, from whom, when, what was received, whether it is complete/authentic, who handled it, and which claims it affects.

## Acquisition Record Schema
Each acquisition receives a unique `ACQ_ID` with:
- request/acquisition ID
- FIN-025 target
- related claim IDs
- priority P0-P4
- request type REQ-A through REQ-J
- record description
- issuing/custodial institution
- repository/office contacted
- date range requested
- identifiers searched
- requester/capacity
- legal/public/contractual basis if applicable
- request date
- delivery method
- response date
- response type
- files/items received
- certification status
- completeness status
- provenance status
- chain-of-custody status
- hash/checksum where available
- FIN-021 evidence IDs created
- FIN-022 recognition effect
- FIN-024 claims affected
- analyst/reviewer
- next action

## Response Types
- `RESP-01 FULL RECORD PRODUCED`
- `RESP-02 PARTIAL RECORD PRODUCED`
- `RESP-03 CERTIFIED RECORD PRODUCED`
- `RESP-04 NO RECORD FOUND`
- `RESP-05 WRONG CUSTODIAN / REFERRAL`
- `RESP-06 ACCESS RESTRICTED`
- `RESP-07 AUTHORIZATION REQUIRED`
- `RESP-08 FEE / PROCESSING REQUIRED`
- `RESP-09 REQUEST TOO BROAD / CLARIFICATION`
- `RESP-10 DENIED — BASIS RECORDED`
- `RESP-11 ACKNOWLEDGED / PENDING`
- `RESP-12 NO RESPONSE`
- `RESP-13 SOURCE ACQUIRED INDEPENDENTLY`

A refusal or no-record response is itself preserved as evidence of the search process but is not automatically proof that the underlying event never occurred.

## Intake Integrity
For every received item:
1. Preserve the received original/native file where possible.
2. Record filename, format, size, creation/modification metadata where available.
3. Compute a cryptographic hash when technically available.
4. Preserve envelope, headers, certification pages, cover letters, archive citations, accession numbers, and retrieval metadata.
5. Create a working copy for analysis.
6. Do not silently alter the evidentiary original.
7. Log every custody transfer or material handling event.

## Certification Classes
- `CERT-0 UNVERIFIED COPY`
- `CERT-1 SOURCE-IDENTIFIED COPY`
- `CERT-2 ARCHIVE/REPOSITORY COPY`
- `CERT-3 CERTIFIED/ATTESTED COPY`
- `CERT-4 ISSUER/REGISTRY AUTHENTICATED`
- `CERT-5 ISSUER/REGISTRY AUTHENTICATED + COUNTERPARTY MATCH`

Certification class addresses the record, not necessarily the truth of every proposition inside it.

## Completeness Classes
- `COMP-0 UNKNOWN`
- `COMP-1 FRAGMENT/EXCERPT`
- `COMP-2 PARTIAL FILE`
- `COMP-3 SUBSTANTIALLY COMPLETE`
- `COMP-4 COMPLETE RECORD SET FOR REQUEST`
- `COMP-5 COMPLETE + INDEX/CHAIN VERIFIED`

## Chain of Custody
Each handling event records:
- evidence/acquisition ID
- date/time
- person/system
- action
- source location
- destination location
- hash before/after where available
- notes/exceptions

## Immediate Intake Registers

### REG-026-A — Governance Originals
Targets ACQ-001.
Track Affidavit of Organization, recorded copy, amendments, Chancellor election/installation records, officer appointments, removal/vacancy instruments, treasury resolutions.

### REG-026-B — Treasury Transition
Targets ACQ-002.
Track former Treasurer removal instrument, notices, signatory records, access logs, handoff records, ledger exports, custody inventory, communications, and reconciliation evidence.

### REG-026-C — TVM / KORAN Primary Instruments
Targets ACQ-003 through ACQ-006.
Track TVM affidavit, 1952/1962 succession instruments, Allied Nations deposit materials, notarial/probate/registry evidence, and institution-side identifier verification.

### REG-026-D — Global Collateral / Sukarno / Bullion
Targets ACQ-007 and ACQ-008.
Track presidential/state archives, IMF/IBRD/Treasury/BIS/central-bank records, appointment instruments, asset schedules, vault/assay/SKR/custody records.

### REG-026-E — Philippine Title / Tallano
Targets ACQ-009 and ACQ-010.
Track certified court dockets, judgments, compromise agreements, OCT/TCT records, decrees, surveys, Registry of Deeds/LRA responses, and adverse decisions.

### REG-026-F — Genealogy
Targets ACQ-011.
Track Tamano/Tallano/Tagean/Acuna/Morden/Macleod civil, church, Spanish-era, tarsila/salsila, probate, and land records.

### REG-026-G — Manhattan Property
Targets ACQ-012.
Track 40 Wall Street and other identified properties: deeds, leaseholds, mortgages, corporate records, litigation, forfeiture, and historical beneficial-ownership evidence.

### REG-026-H — Audiovisual Corpus
Targets ACQ-013.
Track source videos, native files, metadata, transcripts, timestamps, displayed documents, locations, speakers, and derivative copies.

### REG-026-I — Competing Successors
Targets ACQ-014.
Track King Solomon and all other competing succession/trustee/administrator instruments and counterparty recognition evidence.

### REG-026-J — Nibiru / NOMNI / Noone Treasury
Targets ACQ-015.
Track resolutions, bonds/certificates, issuance ledgers, Block 422310, Index 11936042/3/4, asset schedules, reserve/custody evidence, redemption records.

### REG-026-K — Laremy Wade Ten-Year Corpus
Targets ACQ-016.
Track native database files, charts, version history, correspondence, appointments, GLU/UBEC/ECFX records, Maharlika bank records, gold-partnership material, and archived source destinations.

## Current Known Intake Items
The following items are already known to the investigation and should be assigned formal ACQ/evidence IDs as the ledger is populated:
- Noone Society / World Temple governance materials previously reviewed
- supplied Noocratian governance screenshots
- 2016 Consolidated Gold Treasury Bond image
- 2017 Noocratic Social Media Roundtable image
- Allied Nations trust-deposit image/copy
- three Laremy Wade organizational/financial charts
- Alpha Omega YouTube URLs and identified video IDs
- claimant websites and archive directories previously identified

Known existence does not determine certification, completeness, authenticity, or proposition truth. Those fields remain independently scored.

## Missing-Record Protocol
When a competent repository returns no record:
- preserve the response
- record exact query/identifier variants
- record retention scope and repository competence
- check predecessor/successor repositories
- check alternate names/aliases/date ranges
- classify evidentiary effect under FIN-021

Repeated competent negative searches may weaken a proposition, but FIN-021 must document why the negative evidence is probative.

## Request Follow-Up
For pending requests, track:
- statutory/administrative response period if applicable
- follow-up date
- clarification requested
- fee/payment status
- authorization defects
- appeal/review options if a denial mechanism exists

Do not invent deadlines. Any stated deadline must come from the applicable law, rule, contract, or forum authority.

## Evidence Intake to Adjudication Pipeline
`FIN-025 target → FIN-026 acquisition/intake → FIN-021 authentication/contradiction → FIN-022 counterparty recognition → FIN-024 claim adjudication → FIN-023 readiness/escalation`

Every material claim should therefore be traceable backward from an adjudication finding to the actual evidence intake event.

## Dashboard Metrics
FIN-026 should report:
- total targets
- requests prepared/sent
- responses received
- certified records obtained
- no-record responses
- denials/restrictions
- records pending authentication
- evidence objects ingested
- claims materially strengthened
- claims materially weakened/contradicted
- claims closed
- P0/P1 items outstanding

## Current Status
FIN-026 — ACTIVE: PRIMARY-RECORD ACQUISITION AND EVIDENCE-INTAKE CONTROL SCHEMA ESTABLISHED. KNOWN CORPUS ITEMS IDENTIFIED FOR FORMAL INTAKE; RECORD-BY-RECORD REQUEST/RESPONSE POPULATION REMAINS ONGOING.
