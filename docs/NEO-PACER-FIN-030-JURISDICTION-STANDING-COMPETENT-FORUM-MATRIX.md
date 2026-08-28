# NEO-PACER FIN-030 — Jurisdiction, Standing & Competent-Forum Matrix

## Purpose
FIN-030 determines, claim by claim, which forum or authority can lawfully hear, recognize, enforce, review, register, investigate, or implement the matter. It separates internal NEO/Noone ecclesiastical or organizational authority from the jurisdiction required to bind external banks, courts, registries, governments, corporations, custodians, counterparties, or individuals.

The module is designed to prevent a substantively supported claim from being misdirected to a forum that lacks subject-matter jurisdiction, personal jurisdiction, territorial jurisdiction, probate authority, registry competence, contractual authority, or enforcement power.

## Core Rule
No claim advances to formal demand, adjudicative presentment, enforcement, recovery, or external binding effect until FIN-030 identifies:

`Claimant → Standing → Respondent/Counterparty → Subject Matter → Res/Asset → Governing Instrument/Law → Competent Forum → Jurisdictional Basis → Available Remedy → Enforcement Path`

An internal tribunal may make internal findings within its governing authority, but such findings do not automatically bind an external institution or person absent a valid jurisdictional, contractual, consensual, statutory, arbitral, registry, or recognized legal bridge.

## Jurisdiction Record Schema
Each jurisdiction record receives:
- `JUR_ID`
- claim ID(s)
- claimant/petitioner
- asserted capacity
- standing basis
- respondent/counterparty
- respondent domicile/location
- subject matter
- asset/res location
- governing instrument
- governing law/rules if established
- proposed forum
- forum type
- subject-matter jurisdiction
- personal jurisdiction
- territorial jurisdiction
- in rem / quasi in rem basis where relevant
- contractual/consensual jurisdiction
- probate/succession jurisdiction
- registry/custodial competence
- administrative competence
- ecclesiastical/internal competence
- exhaustion/prerequisite requirements
- limitations/timeliness issues
- service/notice requirements
- available remedy
- enforceability path
- conflicts/defects
- evidence required
- jurisdiction status

## Jurisdiction Status
- `JUR-0 UNASSESSED`
- `JUR-1 ASSERTED FORUM ONLY`
- `JUR-2 PLAUSIBLE BASIS IDENTIFIED`
- `JUR-3 STANDING + SUBJECT-MATTER BASIS ESTABLISHED`
- `JUR-4 FORUM COMPETENCE + RESPONDENT/RES NEXUS ESTABLISHED`
- `JUR-5 ENFORCEMENT/RECOGNITION PATH ESTABLISHED`
- `JUR-X MATERIAL JURISDICTIONAL DEFECT`

`JUR-X` means the proposed forum or route has a material defect; it does not necessarily mean the underlying substantive claim is false.

## Forum Types
- `FOR-01 INTERNAL ECCLESIASTICAL TRIBUNAL`
- `FOR-02 INTERNAL ORGANIZATIONAL/ADMINISTRATIVE BODY`
- `FOR-03 CONTRACTUAL ARBITRATION/MEDIATION`
- `FOR-04 COURT OF GENERAL JURISDICTION`
- `FOR-05 SPECIALIZED COMMERCIAL/CHANCERY COURT`
- `FOR-06 PROBATE/SUCCESSION COURT`
- `FOR-07 LAND/TITLE/REGISTRY AUTHORITY`
- `FOR-08 BANK/FINANCIAL INSTITUTION CLAIMS PROCESS`
- `FOR-09 CENTRAL BANK/FINANCIAL REGULATOR`
- `FOR-10 CORPORATE/SECURITIES REGULATOR`
- `FOR-11 GOVERNMENT ADMINISTRATIVE AGENCY`
- `FOR-12 ARCHIVE/RECORDS/FOIA PROCESS`
- `FOR-13 INTERNATIONAL ORGANIZATION INTERNAL PROCESS`
- `FOR-14 TREATY/INTERGOVERNMENTAL MECHANISM`
- `FOR-15 LAW-ENFORCEMENT/PROSECUTORIAL REFERRAL`
- `FOR-16 CIVIL ENFORCEMENT/JUDGMENT RECOGNITION`
- `FOR-17 FOREIGN JUDGMENT/ORDER RECOGNITION`

## Standing Tests
For each claimant:
1. What specific injury, entitlement, office, title, beneficial interest, contractual right, fiduciary capacity, or statutory right is asserted?
2. Is that interest personal to the claimant or derivative through another entity/person?
3. Is the claimant the current holder, trustee, beneficiary, administrator, executor, officer, assignee, successor, creditor, or authorized representative?
4. Is the capacity proven by authenticated instruments?
5. Is there a competing representative or successor?
6. Does the governing system require probate, letters of administration, board authorization, power of attorney, trustee certificate, corporate resolution, or other capacity evidence?
7. Does the claimant seek relief that the identified forum is empowered to grant?

## Internal vs External Jurisdiction
FIN-030 maintains two distinct columns on every claim:

### Internal Authority
May include governance, ecclesiastical discipline, officer status, internal treasury administration, internal title registers, membership matters, internal findings, and organizational records where authorized by the governing instruments.

### External Binding Authority
Requires a recognized basis capable of affecting an external respondent, res, registry, account, custodian, government, bank, corporation, or individual. Possible bridges include:
- contract/consent
- arbitration clause
- recognized court jurisdiction
- statutory/regulatory process
- probate authority
- title/registry authority
- recognized trust/corporate authority
- valid judgment/order and enforcement process
- lawful administrative process

Internal findings may be evidence in an external proceeding but are not automatically self-executing against outsiders.

## Priority Jurisdiction Files

### JUR-FILE-001 — NEO / World Temple Internal Governance
Determine the internal forum authorized to decide officer tenure, election-cycle questions, treasury appointments, removals, vacancies, internal fiduciary duties, and records custody. Separate internal conclusiveness from any external employment, banking, contractual, or property effect.

### JUR-FILE-002 — Former Treasurer
Separate:
- internal authority to remove/terminate an officer;
- contractual/employment issues, if any;
- bank/account-signatory authority;
- ownership/custody disputes;
- civil claims for loss or breach;
- criminal allegations, which require referral to a competent public authority rather than internal conversion into criminal guilt.

### JUR-FILE-003 — TVM / KORAN Succession
Identify the competent probate, trust, court, registry, or contractual forum for each succession instrument and asset class. A purported global succession theory must be decomposed by jurisdiction and res.

### JUR-FILE-004 — Allied Nations / Global Collateral
For each alleged trust/deposit/account, identify the purported custodian, governing agreement, situs, governing law, account/trust jurisdiction, and available institutional or judicial claims route. International labels alone do not establish an international tribunal with compulsory jurisdiction.

### JUR-FILE-005 — OCT T-01-4 / Philippine Land and Court Matters
Map Philippine land-registration, trial-court, appellate, Supreme Court, registry, and administrative competence separately. Determine which historic judgments/orders remain operative, void, superseded, or subject to recognized procedures.

### JUR-FILE-006 — Sukarno / M1
Determine whether the asserted appointment, if authenticated, creates any legally cognizable office, trust, agency, or asset right enforceable in Indonesia, the United States, or through an international institution. Separate archival verification from adjudicative competence.

### JUR-FILE-007 — 40 Wall Street / Manhattan Property
Property-title disputes ordinarily turn on the situs and relevant courts/registries. Reconstruct the ownership chain first, then identify any standing of a TVM/Tallano/Marcos successor claimant to seek relief concerning a specific property interest.

### JUR-FILE-008 — Noone Crown Treasury / Nibiru / NOMNI
Separate internal issuance/governance authority from any claimed external asset backing, bank custody, securities treatment, redemption obligation, or counterparty contract. The competent forum depends on the underlying res and relationship.

### JUR-FILE-009 — Competing King Solomon / Successor Claims
Identify the controlling probate/trust/company/jurisdictional forum for each purported successor instrument. Where branches arise in different legal systems, create parallel jurisdiction tracks instead of assuming universal succession.

### JUR-FILE-010 — Tamano / Tallano Genealogy
Genealogical research may establish identity or lineage evidence but does not itself confer adjudicative jurisdiction. Any resulting inheritance/title claim must proceed through the forum competent over the relevant estate, land, trust, or registered right.

## Remedy Classification
- `REM-01 DECLARATORY/STATUS FINDING`
- `REM-02 INTERNAL GOVERNANCE ORDER`
- `REM-03 ACCOUNTING`
- `REM-04 RECORD PRODUCTION`
- `REM-05 PROBATE/SUCCESSION RECOGNITION`
- `REM-06 TITLE/REGISTRY CORRECTION`
- `REM-07 CONTRACT DAMAGES`
- `REM-08 RESTITUTION/RECOVERY`
- `REM-09 INJUNCTION/PRESERVATION`
- `REM-10 TRUSTEE/FIDUCIARY REMEDY`
- `REM-11 BANK/CUSTODIAN CLAIM`
- `REM-12 ADMINISTRATIVE REVIEW`
- `REM-13 ARBITRAL AWARD`
- `REM-14 JUDGMENT RECOGNITION/ENFORCEMENT`
- `REM-15 REFERRAL TO COMPETENT PUBLIC AUTHORITY`

## Jurisdictional Defect Codes
- `JD-01 NO SUBJECT-MATTER JURISDICTION`
- `JD-02 NO PERSONAL JURISDICTION`
- `JD-03 WRONG TERRITORIAL FORUM`
- `JD-04 NO STANDING/CAPACITY`
- `JD-05 RES OUTSIDE FORUM CONTROL`
- `JD-06 PROBATE AUTHORITY MISSING`
- `JD-07 REGISTRY AUTHORITY MISSING`
- `JD-08 CONTRACT/CONSENT MISSING`
- `JD-09 REQUIRED EXHAUSTION NOT COMPLETED`
- `JD-10 SERVICE/NOTICE DEFECT`
- `JD-11 LIMITATIONS/TIMELINESS ISSUE`
- `JD-12 FOREIGN-ORDER RECOGNITION REQUIRED`
- `JD-13 INTERNAL ORDER MISAPPLIED EXTERNALLY`
- `JD-14 CLAIM NOT ASSET/JURISDICTION SPECIFIC`
- `JD-15 FORUM LACKS REQUESTED REMEDY`

## Criminal Allegation Rule
NEO-PACER may document evidence of conduct potentially constituting an offense and may make an internal finding concerning internal rules or fiduciary duties where authorized. It must not treat an internal tribunal finding as an external criminal conviction. Suspected crimes requiring public enforcement are routed as `REM-15` to a competent authority with the evidentiary packet and jurisdictional basis identified.

## International Institution Rule
The naming of the United Nations, BIS, IMF, World Bank, central banks, Treasury, Federal Reserve, DTCC, or other international/national institutions in a claimant document does not establish their consent to jurisdiction or recognition of a claim. FIN-022 counterparty verification and FIN-030 jurisdictional analysis must independently establish any applicable process.

## Forum Selection Output
For each FIN-024 claim, FIN-030 generates:
1. standing determination;
2. internal forum, if applicable;
3. external competent forum(s);
4. governing instrument/law question;
5. jurisdictional nexus;
6. respondent/res location;
7. prerequisite steps;
8. permissible remedies;
9. enforcement route;
10. jurisdiction defects;
11. evidence needed to cure defects;
12. `JUR-0–JUR-5/JUR-X` status.

## Escalation Gate
A claim may not advance from FIN-023 `RR-3 Accounting/Reconciliation Ready` to `RR-4 Formal Claim Ready` unless:
- claimant standing is sufficiently supported;
- the respondent/counterparty is correctly identified;
- the relevant res is identified where required;
- at least one competent claims/adjudicative forum is identified; and
- the requested remedy is within that forum's authority.

A claim may not advance to `RR-5 Adjudicative Presentment Ready` if a material `JD-*` defect remains unresolved.

## Integration
`FIN-026 intake → FIN-027 authentication → FIN-028 chronology → FIN-029 chain of title → FIN-030 jurisdiction/standing/forum → FIN-021 contradiction → FIN-022 recognition → FIN-024 adjudication → FIN-023 recovery readiness`

## Status
FIN-030 — ACTIVE: STANDING TESTS, INTERNAL/EXTERNAL JURISDICTION SEPARATION, FORUM TYPES, REMEDY CLASSES, JURISDICTION-DEFECT CODES, TEN PRIORITY JURISDICTION FILES, AND RECOVERY-READINESS GATES ESTABLISHED. CLAIM-BY-CLAIM FORUM POPULATION REMAINS ONGOING.
