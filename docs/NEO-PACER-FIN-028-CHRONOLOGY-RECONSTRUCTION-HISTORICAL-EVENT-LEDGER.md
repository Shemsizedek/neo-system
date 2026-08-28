# NEO-PACER FIN-028 — Chronology Reconstruction & Historical Event Ledger

## Purpose
FIN-028 creates the master date-controlled chronology for the financial, title, succession, governance, custody, institutional, audiovisual, and investigative corpus. It prevents later documents, derivative narratives, or retrospective interpretations from being silently projected backward into earlier periods.

Every event is proposition-specific and source-linked. A date asserted by a claimant source is not automatically treated as historically verified.

## Event Record Schema
Each event receives:
- `EVENT_ID`
- asserted/verified date
- date precision: exact / month / year / range / unknown
- event type
- persons/entities
- office/capacity
- jurisdiction/location
- asset/account/property/instrument
- source evidence IDs
- source independence class
- authentication finding
- institutional recognition status
- event confidence
- contradictions
- predecessor event
- successor event
- graph edges affected
- adjudication claims affected
- notes

## Date Status
- `D0 UNSOURCED/ORAL ASSERTION`
- `D1 CLAIMANT-SOURCE DATE`
- `D2 DERIVATIVE/CORROBORATING DATE`
- `D3 INDEPENDENT CONTEMPORARY DATE`
- `D4 AUTHENTICATED PRIMARY DATE`
- `D5 AUTHENTICATED + COUNTERPARTY/REGISTRY MATCH`
- `DX DATE CONFLICT`

## Chronology Domains

### CHR-A — Ancient / Ecclesiastical / Dynastic Title Claims
Record claimed Egyptian, ecclesiastical, royal, Vatican/Holy See, Moorish, Nubian, Maharlika, Lanao/Sulu, and other predecessor-title events exactly as sources assert them. Ancient or sacred-history propositions must remain distinct from modern legal title unless a documentary bridge establishes continuity.

### CHR-B — Colonial / Land / Dynastic Records
Track Spanish-era, colonial, civil, church, land-registration, tarsila/salsila, royal/datu, Tamano/Tallano/Tagean/Acuna and related records. Test earliest documented appearances and name transitions.

### CHR-C — 20th-Century Global Financial Architecture
Track independently documented institutional events such as Bretton Woods-era developments alongside claimant assertions concerning Allied Nations deposits, global collateral, Sukarno/M1, central banks, gold/bullion, IMF/IBRD, Treasury, Federal Reserve, BIS and related structures. Do not merge established institutional history with disputed collateral claims without evidence.

### CHR-D — KORAN / Tallano / TVM Succession
Track each alleged will, trust deposit, appointment, inheritance, assignment, declaration, compromise agreement, decree, affidavit, successor appointment, and competing claim in strict date order.

### CHR-E — Philippine Judicial / Property Events
Track court cases, land-registration events, OCT/TCT/decree records, Marcos-era property events, forfeitures, appellate decisions, and competing title claims.

### CHR-F — Manhattan / International Property Events
Track 40 Wall Street and other identified properties from acquisition/leasehold through financing, beneficial ownership, litigation, forfeiture, transfer, and TVM audiovisual assertions.

### CHR-G — NEO / Noone / World Temple Governance
Current known anchor candidates from reviewed source materials:
- 2015-10-11 — Security Agreement date appearing in the Noone Society corpus.
- 2015-10-18 — organizational establishment date stated in the Affidavit corpus.
- 2015-11-18 — Harris County recording date stated in the reviewed materials.

The exact anniversary controlling the nine-year Chancellor election remains unresolved until the operative election/installation/governance record is authenticated.

Under each plausible 2015 anchor, a second nine-year period begins in 2024. This is a mathematical chronology result, not by itself a finding that every officer's term follows the Chancellor's nine-year cycle.

### CHR-H — Nibiru / NOMNI / Treasury Development
Track resolutions, treasury instruments, consolidated gold treasury bond materials, Nibiru Pool/Reserve/Freedom structures, Noone Crown Treasury, UBEC/ECFX/GLU developments, issuance ledgers, and claimed asset/custody bridges.

### CHR-I — Laremy Wade Ten-Year Corpus
Track the native archive chronologically by creation date, modification/version date, appointment, agreement, chart, transaction, organizational event, and publication date. Preserve the distinction between document creation date and the historical date asserted inside the document.

### CHR-J — Treasury Transition / Current Cycle
Track former Treasurer appointment, authority, removal/termination, notice, credential revocation, handoff, post-termination access, transaction anomalies, successor authority, and present governance cycle events.

## Anchor Events Already Identified for Population
The following events are known from the existing investigative corpus and should be formally populated with evidence IDs as source ingestion proceeds:
- 1940s Bretton Woods / UN-era institutional context
- alleged Allied Nations/global collateral deposit events
- 1952 asserted succession instrument
- 1962 asserted succession instrument
- 1970s Philippine/Tallano instruments and litigation claims
- later Marcos/TVM succession and compromise instruments
- 2000s TVM/Alpha Omega events
- 2009 TVM Manhattan audiovisual event
- 2015 Noone Society organizational/security/recording dates
- 2016 Nibiru/Noone treasury materials
- 2017 Noocratic/organizational materials
- later UBEC/ECFX/GLU/TMA network materials
- 2024 beginning of the second nine-year period under each presently plausible 2015 anchor
- current former-Treasurer transition/investigation

These are chronology anchors, not blanket findings that every associated claim has been authenticated.

## Collision Tests
FIN-028 automatically flags:
- instrument dated before purported issuer/entity existed
- office/title used before creation
- successor appointment before predecessor acquired authority
- transfer after transferor's authority terminated
- asset transferred twice without an intervening reacquisition
- account/instrument identifier appearing before the relevant system existed
- later document represented as contemporaneous evidence
- property ownership claim outside the documented ownership period
- probate/succession event inconsistent with death/testament chronology
- court judgment date inconsistent with docket chronology
- notarial act outside notary commission period
- document version predating its earliest traceable publication without supporting provenance

## Chronology Confidence
- `T0 ASSERTED`
- `T1 INTERNALLY CONSISTENT`
- `T2 MULTI-SOURCE`
- `T3 INDEPENDENTLY CORROBORATED`
- `T4 PRIMARY AUTHENTICATED`
- `T5 PRIMARY + COUNTERPARTY/REGISTRY CONFIRMED`

## Historical Context Rule
FIN-028 distinguishes:
1. independently established historical event;
2. claimant source's interpretation of that event;
3. alleged private agreement or asset relationship associated with that event;
4. evidence connecting the private claim to the established event.

For example, the existence of a historical international conference or institution cannot alone authenticate a separately alleged collateral account, trust deposit, appointment, or private title.

## Timeline Views
The engine should support:
- master chronological view
- person-specific timeline
- institution-specific timeline
- asset-specific timeline
- title/succession timeline
- account/custody timeline
- governance/officer timeline
- property timeline
- evidence-publication timeline
- contradiction-only timeline

## Event-to-Claim Audit
Every material FIN-024 claim must be traceable to its critical chronology events. A claim cannot advance to high recovery readiness if a dispositive chronology collision remains unresolved.

## Immediate Chronology Work Queue
1. Populate authenticated Noone Society dates and resolve the Chancellor-cycle anchor.
2. Build former Treasurer authority and access timeline.
3. Build 1952→1962→1970s→1980s→2000s TVM/KORAN succession timeline.
4. Build Allied Nations deposit/custody timeline and resolve 1952/1974 date conflict.
5. Build OCT T-01-4 and related Philippine court/registry timeline.
6. Build Sukarno/M1 claim timeline against primary Indonesian/U.S./international institutional archives.
7. Build 40 Wall Street/Manhattan property timeline against deeds, leaseholds and litigation.
8. Build Nibiru/NOMNI/Noone Crown Treasury issuance timeline.
9. Build Laremy Wade corpus creation/version timeline.
10. Build Alpha Omega video upload/event chronology.

## Integration
`FIN-026 intake → FIN-027 authentication → FIN-028 chronology → FIN-021 contradiction engine → FIN-022 recognition → FIN-024 adjudication → FIN-023 readiness`

## Status
FIN-028 — ACTIVE: MASTER CHRONOLOGY SCHEMA, DATE CONFIDENCE, DOMAIN TIMELINES, COLLISION TESTS, AND INITIAL ANCHOR EVENTS ESTABLISHED. SOURCE-BY-SOURCE EVENT POPULATION AND DATE AUTHENTICATION REMAIN ONGOING.
