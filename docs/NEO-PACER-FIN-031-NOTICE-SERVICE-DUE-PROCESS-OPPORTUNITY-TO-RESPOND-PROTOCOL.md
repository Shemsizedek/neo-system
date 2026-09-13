# NEO-PACER FIN-031 — Notice, Service, Due Process & Opportunity-to-Respond Protocol

## Purpose
FIN-031 establishes the procedural-maturity layer for NEO-PACER investigations, internal tribunal proceedings, title audits, treasury reviews, professional-accountability matters, and claim adjudication. It governs how a person, office, institution, custodian, successor claimant, former officer, or other affected party is notified of a material allegation or proposed adverse finding and given a meaningful opportunity to respond before the record is treated as procedurally mature.

FIN-031 does not create external legal jurisdiction where none exists. Service, notice, default, or an internal tribunal finding cannot by themselves bind an external bank, court, government, registry, corporation, custodian, or individual absent a valid jurisdictional, contractual, arbitral, organizational, ecclesiastical, or other recognized legal basis under FIN-030.

## Core Procedural Rule
Before a contested adverse finding advances beyond investigative status, NEO-PACER should be able to show:

`Identified Claim → Evidence Packet → Competent Notice Target → Valid Notice Method → Delivery/Service Record → Response Window → Response/Rebuttal/No Response → Neutral Review → Finding Classification → Appeal/Review Path if Applicable`

No adverse inference should be drawn merely from silence unless the governing forum, agreement, rule, or procedure supports that consequence and adequate notice has been established.

## Proceeding Record Schema
Each notice/service event receives:
- `PROC_ID`
- case/claim ID
- FIN-024 claim IDs
- FIN-030 jurisdiction/standing record
- affected person/entity
- role/capacity
- contact/service address or authorized channel
- notice type
- allegations/issues noticed
- evidence packet version/hash
- governing authority/rule/agreement
- delivery/service method
- dispatch date/time
- delivery confirmation
- recipient identity confirmation
- response deadline, if validly established
- response received date
- response classification
- exhibits received
- rebuttal/counter-evidence IDs
- analyst/judicial-review status
- procedural defects
- cure actions
- final procedural status

## Notice Classes
- `NTC-01 INFORMATION REQUEST`
- `NTC-02 VERIFICATION REQUEST`
- `NTC-03 NOTICE OF CLAIM`
- `NTC-04 NOTICE OF DISPUTED TITLE/INTEREST`
- `NTC-05 NOTICE OF EVIDENTIARY CONFLICT`
- `NTC-06 NOTICE OF PROPOSED ADVERSE FINDING`
- `NTC-07 NOTICE OF INTERNAL GOVERNANCE ACTION`
- `NTC-08 NOTICE OF TREASURY/ACCOUNTING EXCEPTION`
- `NTC-09 NOTICE OF CUSTODY/ASSET RECONCILIATION ISSUE`
- `NTC-10 NOTICE OF HEARING/SESSION`
- `NTC-11 NOTICE OF DECISION/FINDING`
- `NTC-12 APPEAL/REVIEW NOTICE`
- `NTC-13 PRESERVATION/HOLD NOTICE`

## Service / Delivery Classes
- `SRV-0 NOT SENT`
- `SRV-1 PREPARED`
- `SRV-2 SENT — DELIVERY UNCONFIRMED`
- `SRV-3 DELIVERED TO CHANNEL/ADDRESS`
- `SRV-4 RECEIPT ACKNOWLEDGED`
- `SRV-5 AUTHORIZED RECIPIENT CONFIRMED`
- `SRV-X DEFECTIVE/UNRELIABLE SERVICE`

The service class records what can actually be proven. An email sent to an unverified address is not equivalent to acknowledged delivery to an authorized recipient.

## Permitted Delivery Methods
Depending on the governing forum or relationship:
- personal service by authorized process server
- certified/registered mail
- recognized commercial courier
- authorized email address
- contractual notice portal
- institutional correspondence channel
- registered-agent address
- counsel/authorized representative
- internal organizational notice channel
- secure NEO-PACER portal acknowledgement

Social-media posting, public publication, or informal messaging is not treated as formal service unless the governing authority, contract, tribunal rule, or applicable procedure permits it.

## Evidence Packet Standard
A notice of proposed adverse finding should identify, at minimum:
1. the claim or issue;
2. the material evidence relied upon;
3. the material contradictions or missing records;
4. the proposed finding classification;
5. the authority under which the matter is being considered;
6. the method and deadline for response, where applicable;
7. how rebuttal evidence may be submitted;
8. the consequences of failing to respond, if any and if lawfully supported.

The packet must not misrepresent investigative allegations as established criminal convictions, government determinations, or externally binding judgments.

## Response Classifications
- `RSP-01 FULL SUBSTANTIVE RESPONSE`
- `RSP-02 PARTIAL RESPONSE`
- `RSP-03 DENIAL`
- `RSP-04 ADMISSION/ACKNOWLEDGMENT`
- `RSP-05 DOCUMENT PRODUCTION`
- `RSP-06 JURISDICTIONAL OBJECTION`
- `RSP-07 STANDING OBJECTION`
- `RSP-08 AUTHENTICITY OBJECTION`
- `RSP-09 PROCEDURAL OBJECTION`
- `RSP-10 REQUEST FOR EXTENSION`
- `RSP-11 REFUSAL TO RESPOND`
- `RSP-12 NO RESPONSE`
- `RSP-13 RESPONSE FROM UNVERIFIED/UNAUTHORIZED PERSON`

All substantive responses become evidence objects under FIN-021 and must be assessed using the same provenance and authentication standards applied to claimant-side materials.

## Default Rule
A procedural default may be recorded only where:
- jurisdiction/authority has been established for the proceeding;
- the recipient was entitled to notice;
- the notice method was valid under the governing framework;
- service/delivery is adequately proven;
- the response period was valid and expired;
- no timely response, extension, or cure remains pending.

Even where default is procedurally available, default does not automatically authenticate underlying evidence or prove an external criminal allegation. The tribunal must still assess evidentiary sufficiency.

## Procedural Defect Codes
- `PD-01 WRONG RECIPIENT`
- `PD-02 ADDRESS/CHANNEL UNVERIFIED`
- `PD-03 DELIVERY UNPROVEN`
- `PD-04 INSUFFICIENT NOTICE OF ISSUE`
- `PD-05 MATERIAL EVIDENCE OMITTED`
- `PD-06 RESPONSE WINDOW UNSUPPORTED`
- `PD-07 PREJUDGMENT / FINDING ISSUED BEFORE RESPONSE`
- `PD-08 JURISDICTION UNRESOLVED`
- `PD-09 STANDING UNRESOLVED`
- `PD-10 CONFLICT OF INTEREST`
- `PD-11 EX PARTE MATERIAL NOT DISCLOSED WHERE DISCLOSURE REQUIRED`
- `PD-12 RESPONSE NOT INGESTED/CONSIDERED`
- `PD-13 APPEAL/REVIEW PATH OMITTED WHERE REQUIRED`
- `PD-14 IDENTITY OF RESPONDENT UNRESOLVED`
- `PD-15 CONFIDENTIAL/SEALED MATERIAL IMPROPERLY DISCLOSED`

## Cure Protocol
Where a material procedural defect exists:
1. freeze adverse-status advancement;
2. identify the defect;
3. preserve the defective notice/service record;
4. correct recipient/channel/content/authority as applicable;
5. reissue notice where lawful and appropriate;
6. provide a renewed response opportunity;
7. document the cure;
8. resume review only after the defect is resolved.

## Internal NEO / Ecclesiastical Proceedings
For NEO Society, World Temple, Noone Society, treasury offices, tribunal, ecclesiastical, membership, officer, or internal-governance matters, FIN-031 should be read together with the governing charter, covenant, bylaws, resolutions, appointment instruments, disciplinary rules, arbitration agreements, and FIN-030 jurisdiction analysis.

Internal authority may support internal remedies such as:
- removal from office;
- suspension of internal privileges;
- treasury/account access revocation;
- internal findings;
- membership discipline;
- record correction;
- internal restitution/accounting directives;
- internal appeal or review.

It does not automatically authorize seizure of external assets, criminal punishment, binding orders to unrelated institutions, or the exercise of state judicial power.

## Former Treasurer / Treasury Transition Protocol
Where allegations concern a former Treasurer or other officer:
- authenticate appointment and scope of authority;
- authenticate termination/removal and effective date;
- preserve access/signatory and transaction records;
- distinguish routine transition defects from misconduct allegations;
- disclose the specific questioned transactions or acts;
- provide an opportunity to explain or produce records before final adverse findings where required by the governing internal process;
- separately route suspected external criminal conduct, if supported, to a competent public authority rather than labeling an internal finding as a criminal conviction.

## Competing Successor / Title Claimant Protocol
Where two or more successors claim the same trust, estate, title, custody right, account, bullion, land, or administrative office:
- provide each materially affected claimant notice of the competing chain where appropriate;
- disclose the chain break or collision under FIN-029;
- permit production of wills, assignments, probate records, trustee instruments, registry records, or counterparty recognition evidence;
- preserve each chain independently;
- do not resolve the dispute merely by volume of submissions or failure of one party to engage informally.

## Institutional Verification Protocol
Requests to banks, central banks, registries, courts, archives, government agencies, custodians, or international organizations should normally be framed first as neutral verification or records requests under FIN-022/FIN-025/FIN-026 rather than accusatory notices. Escalation to a formal claim should occur only when standing, jurisdiction, evidence, and remedy are sufficiently developed.

## Procedural Maturity Scale
- `PM-0 INVESTIGATIVE ONLY`
- `PM-1 NOTICE TARGET IDENTIFIED`
- `PM-2 NOTICE PACKET PREPARED`
- `PM-3 NOTICE SENT`
- `PM-4 DELIVERY/SERVICE ADEQUATELY ESTABLISHED`
- `PM-5 RESPONSE PERIOD COMPLETE / RESPONSE INGESTED`
- `PM-6 NEUTRAL REVIEW COMPLETE`
- `PM-7 PROCEDURALLY MATURE FOR INTERNAL FINDING/ADJUDICATION`
- `PM-X MATERIAL PROCEDURAL DEFECT`

A claim may have strong evidence but remain procedurally immature.

## Appeal / Review Layer
Where the governing framework provides review:
- identify review authority;
- filing window;
- scope of review;
- record transmitted;
- new-evidence rule;
- stay/suspension effect;
- finality status.

An internal appeal structure should not be described as equivalent to a state appellate court unless legally established as such.

## NEO-System Integration
This conversation and the FIN-008 through FIN-031 architecture are treated as canonical NEO-system design context for:
- **NEO Algo:** evidentiary scoring, procedural gates, contradiction handling, chronology, title-chain logic, and adjudication constraints.
- **NEO Oracle:** provenance-aware retrieval, institutional verification, timeline reconstruction, source conflict analysis, and counterparty checks.
- **GISS NEO LMS:** curriculum for forensic due diligence, evidence authentication, title auditing, procedural fairness, jurisdiction, source criticism, and noological analysis.
- **NEOsync — Digital Etheric Intelligence:** workflow orchestration across intake, preservation, authentication, notice, response, review, escalation, audit, and approved action.
- **NEO Law:** jurisdiction-first legal/natural-law analysis, standing, due process, evidentiary classification, internal-versus-external authority separation, and remedy routing.
- **Internal NEO Society social norms:** fair notice, right of response, evidence before accusation, transparent authority, conflict-of-interest controls, proportionality, auditability, and correction of errors without silent historical rewriting.
- **N.I.A. / Project 144:** collection → provenance → verification → analysis → notice/response where appropriate → decision support → authorized action → audit.
- **NEO Router:** routing evidence and procedural events to the proper module or competent forum.
- **NEO Lingo/Lexicon:** canonical definitions for claim, allegation, finding, judgment, notice, service, default, authentication, jurisdiction, standing, custody, title, beneficial ownership, trustee, and successor.
- **NEO-PACER / Tribunal:** docket integrity, evidence vault, claim graph, contradiction engine, professional accountability ledger, orders/findings, and immutable audit trail.
- **Shelton Estate & Co. / Family Office:** treasury governance, officer-transition controls, asset/custody verification, counterparty correspondence, and recovery-readiness review.

Canonical integration principle: claims must remain distinguishable as **fact, authenticated record, inference, allegation, theory, internal determination, external determination, and unknown**. No NEO component should silently promote one category into another.

## Integration Pipeline
`FIN-025 acquisition planning → FIN-026 intake → FIN-027 authentication → FIN-028 chronology → FIN-029 chain of title → FIN-030 jurisdiction/standing → FIN-031 notice/due process → FIN-021 contradiction analysis → FIN-022 recognition → FIN-024 adjudication → FIN-023 readiness/escalation`

## Status
FIN-031 — ACTIVE: NOTICE, SERVICE, RESPONSE, DEFAULT, PROCEDURAL-DEFECT, CURE, REVIEW, AND NEO-SYSTEM INTEGRATION PROTOCOLS ESTABLISHED. CLAIM-SPECIFIC PROCEDURAL RECORDS REMAIN TO BE POPULATED.
