# NEO-PACER FIN-021 — Source-to-Graph Evidence Ingestion & Contradiction Engine

## Purpose
FIN-021 converts heterogeneous evidence into standardized evidence objects that can create, support, weaken, contradict, supersede, or leave unresolved the nodes and edges maintained in FIN-020.

The module is designed for documentary due diligence. It preserves what a source actually says while preventing a claimant statement, organizational chart, copied instrument, video statement, or later republication from being silently promoted into an independently verified fact.

## Inputs
FIN-021 accepts:
- affidavits and declarations
- court opinions, pleadings, orders, dockets, and exhibits
- deeds, wills, trusts, covenants, letters patent, appointments, resolutions, and succession instruments
- banking, treasury, reserve, bond, certificate, bullion, custody, ledger, and transaction records
- government and institutional records
- organizational charts and financial-flow diagrams
- screenshots, photographs, scans, and copies
- websites and archived webpages
- news and journalistic publications
- interviews and conference materials
- audiovisual evidence and timestamped video claims
- genealogical and historical sources
- correspondence, notices, emails, and internal records

## Evidence Object Schema
Every source-derived proposition becomes an Evidence Object with, at minimum:

- `evidence_id`
- `source_id`
- `source_type`
- `source_title`
- `source_creator_or_issuer`
- `source_date`
- `publication_or_filing_date`
- `retrieval_date`
- `original_or_copy_status`
- `provenance_status`
- `page_line_timestamp`
- `exact_language_or_faithful_extract`
- `normalized_proposition`
- `named_entities`
- `identifiers`
- `assets_or_accounts`
- `amount_or_quantity`
- `jurisdiction`
- `graph_nodes_affected`
- `graph_edges_affected`
- `evidentiary_role`
- `authentication_status`
- `corroboration_status`
- `contradiction_status`
- `independence_status`
- `confidence_class`
- `analyst_notes`

## Preserve-First Rule
The source's terminology and proposition must be preserved before normalization. The engine may create a normalized analytical proposition, but it must not rewrite the source in a manner that changes its legal, historical, ecclesiastical, financial, genealogical, or factual meaning.

A source that says an entity "owns" an asset is stored first as `SOURCE ASSERTS OWNERSHIP`. The engine must separately determine whether the evidence establishes legal title, beneficial ownership, custody, possession, administration, security interest, succession, or merely a claim of ownership.

## Evidentiary Roles
Each Evidence Object receives one or more roles:

- `ASSERTION` — source makes a proposition.
- `AUTHENTICATION` — source helps establish genuineness or execution.
- `CORROBORATION` — independently supports another proposition.
- `CONTRADICTION` — materially conflicts with another proposition.
- `CUSTODY` — establishes or alleges physical/digital custody.
- `TITLE` — establishes or alleges legal title.
- `BENEFICIAL_INTEREST` — establishes or alleges beneficial ownership.
- `SUCCESSION` — establishes or alleges transfer by inheritance, appointment, trust succession, assignment, or similar mechanism.
- `TRANSACTION` — records or alleges movement of value.
- `AUTHORITY` — establishes or alleges capacity to act.
- `NOTICE` — establishes delivery/publication of a claim or demand, not acceptance of the claim.
- `IDENTITY` — relates names, aliases, offices, credentials, genealogy, or entity identity.
- `CONTEXT` — provides historical or institutional background without independently establishing the disputed transaction/title proposition.

## Source Independence
FIN-021 must detect circular corroboration. Multiple webpages repeating the same underlying document, interview, claimant publication, or press release do not become independent evidence merely because they appear on different domains.

Independence classes:
- `I0` same source or duplicate
- `I1` derivative/republication
- `I2` related-party source
- `I3` independent secondary source
- `I4` independent primary/counterparty source
- `I5` authoritative registry, court, issuer, custodian, or institution-side record where relevant

## Authentication Classes
- `A0` unidentified/unauthenticated
- `A1` source located but provenance incomplete
- `A2` provenance partially established
- `A3` execution/issuer identity substantially supported
- `A4` authenticated by competent primary evidence
- `A5` authenticated and independently matched to relevant counterparty/registry/custodian records

Authentication does not automatically establish the truth of every statement inside an authentic document.

## Contradiction Engine
A contradiction is created when two Evidence Objects cannot both be true in the same relevant sense, time, capacity, asset, or jurisdiction.

Contradiction types include:
- `DATE_COLLISION`
- `IDENTITY_COLLISION`
- `OFFICE_CAPACITY_COLLISION`
- `SUCCESSION_COLLISION`
- `TITLE_COLLISION`
- `BENEFICIARY_COLLISION`
- `CUSTODY_COLLISION`
- `QUANTITY_COLLISION`
- `ACCOUNT_IDENTIFIER_COLLISION`
- `INSTITUTIONAL_RECOGNITION_COLLISION`
- `JURISDICTION_COLLISION`
- `CHRONOLOGY_ANACHRONISM`
- `ORIGINAL_COPY_COLLISION`
- `TRANSACTION_COLLISION`
- `TERMINATED_AUTHORITY_COLLISION`

## Contradiction Disposition
Each contradiction receives:
- proposition A
- proposition B
- exact sources
- affected graph nodes/edges
- whether the conflict is real or merely semantic
- possible reconciliation hypotheses
- additional evidence required
- disposition: `OPEN`, `RECONCILED`, `SOURCE_ERROR`, `SUPERSEDED`, `UNRESOLVED`, or `MATERIAL_CONTRADICTION`

The engine must not force reconciliation where the evidence does not support one.

## Graph Effect Rules
Evidence may affect FIN-020 edges as follows:

- `CREATE` — create a new asserted relationship.
- `STRENGTHEN` — add independent support to an existing edge.
- `WEAKEN` — introduce material uncertainty without direct contradiction.
- `CONTRADICT` — add incompatible evidence.
- `SUPERSEDE` — later valid authority replaces earlier authority where legally/documentarily supported.
- `TERMINATE` — evidence establishes an end date to an authority or relationship.
- `NO_EFFECT` — source is relevant context but does not alter the graph proposition.

No graph edge may be upgraded solely because the same claim is repeated many times.

## Special Handling — Organizational and Financial Charts
Every line on a chart becomes an asserted `NET-EDGE`, initially classified as diagrammatic evidence only. The edge must then be tested against underlying agreements, appointment records, counterparty records, transactions, filings, correspondence, or other documentary support.

A logo, acronym, institution name, or visual placement on a chart does not establish participation, consent, ownership, agency, affiliation, recognition, or contractual relationship by that institution.

## Special Handling — Video Corpus
For audiovisual evidence, create timestamp-level Evidence Objects:

`video_id → timestamp → speaker → exact/faithful statement → person/entity named → asset/account/title identified → document displayed → location → action observed → analytical proposition`

The engine must distinguish:
- what is visibly observable
- what the speaker states
- what a caption/editor states
- what later commentary claims the footage proves

Physical entry into a building or presentation of credentials is not equivalent to official authentication unless the record establishes authentication or recognition.

## Special Handling — Historical and Genealogical Material
Historical treatises, genealogies, tarsila/salsila, royal pedigrees, oral histories, and later compilations may establish or support lineage propositions according to their provenance and methodology. They do not automatically establish modern legal ownership of an asset.

Name-transition hypotheses—such as Tamano/Tallano or other alias/dynastic-name questions—must be stored as hypotheses until documentary bridges are located.

## Special Handling — TVM / KORAN / Global Collateral Corpus
Identifiers and claims associated with TVM-LSM-666, KORAN, wills, trust deposits, Allied Nations instruments, bullion, account numbers, treasury identifiers, and alleged collateral structures must be ingested exactly as represented in the source.

External institutional recognition is a separate proposition. A claimant-side document containing the name of a government, bank, central bank, international institution, or clearing organization does not by itself establish that organization's acceptance or participation.

## Special Handling — NEO / World Temple / Noone / Nibiru / UBEC / ECFX Corpus
Internal organizational records may establish internal governance, appointments, policies, asserted asset relationships, or internal recognition subject to authentication. External relationships require counterparty-side or otherwise independent evidence before they are represented as externally recognized relationships.

## Former Treasurer / Transition Evidence
FIN-021 integrates FIN-017 through FIN-019. Evidence relating to the former Treasurer must distinguish:
- confirmed appointment/authority
- confirmed termination/removal
- access status
- custody status
- transaction activity
- alleged sabotage or misconduct
- evidence supporting or contradicting each allegation

Removal from office is not itself evidence of sabotage. Conversely, records showing post-termination access or unauthorized activity must not be ignored merely because an officer was formally removed.

## Claim Confidence
Suggested proposition confidence classes:
- `C0` allegation/unverified assertion
- `C1` documented claimant/internal assertion
- `C2` partially corroborated
- `C3` independently corroborated
- `C4` authenticated primary support
- `C5` authenticated plus relevant counterparty/registry/custodian confirmation

Confidence must be proposition-specific. A document can be authentic while a proposition contained in it remains C0-C2.

## Required Outputs
FIN-021 generates:
1. Evidence Object Register
2. Source Provenance Register
3. Duplicate/Derivative Source Map
4. Contradiction Register
5. Graph Edge Change Log
6. Authentication Queue
7. Counterparty Verification Queue
8. Missing Evidence Queue
9. Chronology Collision Report
10. Claim Confidence Report

## Priority Ingestion Queue
The present corpus should be processed in this order:
1. governing Noone Society / World Temple instruments
2. TVM Affidavit and attached/identified instruments
3. alleged 1952 and 1962 succession instruments
4. Allied Nations trust-deposit materials
5. later TVM succession and compromise instruments
6. Nibiru / Noone Crown Treasury / NOMNI instruments
7. Laremy Wade ten-year organizational and financial database
8. Alpha Omega audiovisual corpus
9. Manhattan property records and related litigation/title material
10. competing successor-trustee materials
11. institution-side government, bank, registry, court, and custodian records

## Audit Rule
NEO-PACER must be capable of saying all of the following without contradiction:

- "This document exists."
- "This document appears authentic / remains unauthenticated."
- "This document says X."
- "An independent source also says X."
- "The relevant counterparty confirms / does not confirm X."
- "X is contradicted by Y."
- "The evidence is presently insufficient to decide between X and Y."

Those are distinct forensic findings.

## Status
FIN-021 — ACTIVE: SOURCE-TO-GRAPH EVIDENCE NORMALIZATION, PROVENANCE, AUTHENTICATION, INDEPENDENCE, CONTRADICTION, AND GRAPH-EFFECT RULES ESTABLISHED. BULK CORPUS INGESTION AND CLAIM-BY-CLAIM POPULATION REMAIN ONGOING.
