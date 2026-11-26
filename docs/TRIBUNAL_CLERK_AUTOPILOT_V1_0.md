# NEO Tribunal Clerk — Autopilot Operating Specification (Project 144)

Status: design baseline / implementation gate 1
Scope: World Interfaith Court on holytemples.org and the authenticated Tribunal workspace.
Production changes: none in this gate.

## Mission

The Tribunal Clerk is the central administrative intake, docketing, records, document-preparation, scheduling, communications, and service-coordination layer for the World Interfaith Court. The principal remains the Temple's presiding judge/chaplain. The Clerk is an administrative assistant, not an autonomous adjudicator.

All channels converge on the existing Tribunal record system. Do not create duplicate case records when an intake, email, attachment, or filing can be linked to an existing case or receipt.

## Verified existing foundation

- Public E-File page: `public/efile.html`; submits to `POST /v1/public/intake`.
- Public intake is encrypted and assigned a receipt code and SHA-256 payload hash. It enters `PENDING_REVIEW`; a Judge claims it for review and an authorized Clerk promotes it to an E-File. The receipt expressly does not establish acceptance, jurisdiction, service, or external legal sufficiency.
- Authenticated backend already supports workspaces, role-based access, cases, E-Files, notices, hearings, communications templates/outbox, provider configuration, delivery attempts, service recipients, proof records, deadline-rule profiles, audit export/verification, and public records.
- Public docket records are separately published; private Tribunal material must not be automatically exposed.
- Existing role vocabulary: GRAND_SHEIK, JUDGE, CLERK, MARSHAL, REVIEWER, VIEWER.
- Canonical context requires preserving historical instruments and separating fact, allegation, inference, doctrine, argument, law, and unknowns. Internal institutional records must not be represented as external governmental recognition or legal authority.

## Clerk operating workflow

1. **Capture** — receive website E-File, approved WordPress form submissions, designated court email, uploaded documents, and authorized in-person clerk entries.
2. **Normalize** — record source, received timestamp, sender/submitter, document type, attachments, consent, and source message/receipt identifiers. Preserve original bytes and metadata.
3. **Deduplicate** — match receipt code, existing case number, filing ID, message ID, attachment hash, and party/date references. Attach new material to the existing matter when confidently matched; quarantine ambiguous matches for human review.
4. **Triage** — classify matter type and urgency; identify missing fields, missing exhibits, requested relief, requested courier/service, and potential deadlines. Label every extracted statement as allegation, evidence, verified fact, legal authority, or unknown.
5. **Docket** — issue an internal intake receipt immediately. A new official case number is assigned only after authorized acceptance and validation. Never represent an intake receipt as an accepted case.
6. **Bitcoin record** — prepare a canonical docket-event manifest, hash the exact event/document set, and queue an anchoring request. A Bitcoin broadcast is recorded as pending until independently confirmed on-chain. Store txid, network, block height, confirmation count, timestamp, and manifest hash. Never claim a broadcast or confirmation that did not occur. Do not put private case content or personal data on-chain.
7. **Prepare documents** — use approved Canva templates as source masters; populate only verified fields. Produce drafts with case number, document type, version, date, source links, and review status. Preserve the original template and every issued version.
8. **Calendar and deadlines** — extract dates and propose deadline calculations only against an enabled, jurisdiction/procedure-specific rule profile with cited authority. Flag missing service dates, holidays, jurisdiction, or rule authority; never invent a deadline.
9. **Communicate** — draft receipts, deficiency notices, status updates, scheduling requests, and correspondence. Queue outbound communication for review when it concerns a party, court, government, legal position, confidential evidence, or service.
10. **Courier / service coordination** — verify recipient and address against an approved directory and case record; prepare a service package and compare permitted methods. Record provider, tracking/reference, attempts, receipts, failures, and proof. A provider delivery receipt is not automatically proof of legally effective service.
11. **Hearing support** — prepare calendars, agendas, exhibit indexes, chronology, and draft minutes. The Judge controls hearing decisions, rulings, findings, opinions, orders, and judgments.
12. **Close and preserve** — reconcile the case checklist, final documents, delivery evidence, Bitcoin anchor state, outstanding tasks, and retention status. Preserve an append-only audit trail.

## Automation permissions

### Routine actions the Clerk may perform automatically
- Read authorized records and designated mailboxes.
- Index and hash incoming files; extract metadata; detect duplicates.
- Create internal intake work items and sanitized status summaries.
- Draft forms, notices, correspondence, exhibit lists, chronologies, calendars, and checklists.
- Prepare document packets and service/courier requests without dispatch.
- Monitor delivery callbacks and flag failures.
- Alert the principal only for urgent deadlines, material new evidence, conflicts, failed delivery, missing authority, or approvals.

### Approval gates
- Judge/authorized human approval for acceptance into the authoritative docket, case number issuance, jurisdictional determinations, rulings, findings, opinions, orders, judgments, dismissals, and public-record publication.
- Specific approval before sending external correspondence, transmitting any filing/fax, initiating service or courier dispatch, or disclosing case documents.
- Verified recipient, destination, exact final document set, channel, and approval must be bound to each external transmission.
- No purchase, subscription, legal attestation, signature, financial transfer, irreversible action, or production deployment without separate authorization.
- No autonomous representation that the Tribunal is a state or governmental court, that its orders bind non-consenting parties, or that service is legally effective absent applicable authority.

## Canva template inventory discovered

Design: **World Tribal Court Forms** (six pages; Canva design ID DAD0yBZAvug).
Extracted template types:
- Civil Summons
- Court Order
- Change of Name Certificate
- Civil Subpoena
- Default Judgment
- Summary Judgment

The source includes a 38-day response period in summons/subpoena text. Treat this as legacy template language only. It must not be auto-populated or presented as a valid deadline until the governing rules, jurisdiction, service method, and applicable authority are reviewed and approved. The templates contain signature/chancellor language; the Clerk may prepare drafts but must not sign or attest.

## Intake channels and source-of-truth rules

- Website: existing moderated public intake is the authoritative intake boundary; keep its receipt code and payload hash.
- Email: ingest only explicitly designated Tribunal mailboxes/labels. Use provider message/thread IDs and attachment hashes to prevent duplication. Do not copy sensitive case content into general project notes.
- WordPress: inspect form-response storage and route only verified submissions into the same intake registry; do not create a parallel case database.
- Canva: templates are source masters; generated documents are versioned case artifacts, not replacements for masters.
- Notion: use as a case index/administrative view only where existing records are verified; link to the Tribunal source record rather than copying the entire case file.
- GitHub: source code, schemas, tests, runbooks, and release evidence only; never store live party documents or secrets in the repository.

## Missing integration work / next gates

1. **Source inventory** — identify designated Tribunal mailbox(es), existing WordPress form response IDs/storage, Notion databases and case keys, and current authenticated workspace ID. Verify read permissions and retention controls.
2. **Canva production templates** — obtain editable masters, map each field, correct legacy text through an approved template revision, and produce a non-sensitive sample packet for visual review.
3. **Bitcoin anchoring adapter** — inspect available Counterparty/Bitcoin broadcaster, signing boundary, fee policy, confirmation monitor, and failure/retry path. Begin with test vectors/regtest or dry-run; no live broadcast without approval.
4. **Courier/eFax provider registry** — compare API capabilities, recipient validation, delivery receipts, callback signatures, retry/dead-letter behavior, privacy terms, retention, pricing, and data residency. Do not activate or purchase.
5. **Workflow integration** — connect verified channels to the existing moderated intake and docket APIs with idempotency keys, least-privilege roles, immutable audit events, and human approval gates.
6. **Test and release** — test duplicate email/form submissions, wrong-recipient prevention, malformed attachments, permission boundaries, missing rule profiles, delivery failure, callback forgery, Bitcoin reorg/unconfirmed states, and rollback. Keep production unchanged until a separately approved release gate.

## Required operational dashboard

- New / pending review / under review / accepted / rejected / withdrawn
- Case number, intake receipt, source channel, received timestamp, assigned clerk, judge-review state
- Missing documents and outstanding responses
- Deadline basis, source rule, confidence, and alert state
- Draft / approved / queued / sent / delivered / failed correspondence
- Service/courier provider, verified destination, attempt history, receipt, proof status
- Bitcoin anchor: not prepared / prepared / broadcast pending / confirmed / failed
- Hearing schedule, document packet versions, audit integrity, and next action

## Acceptance criteria for the first working release

- One incoming matter creates one intake record, even if received through multiple channels.
- Original documents are preserved and content is encrypted at rest.
- The Clerk can prepare a complete draft packet from approved templates without signing or sending it.
- No new official case number or public docket entry is created before the required human gate.
- Every state transition is attributable, timestamped, auditable, and reversible where appropriate.
- External transmission cannot occur without verified destination + exact final files + specific approval.
- Bitcoin status is evidence-backed; no unverified broadcast/confirmation claim.
- Existing Tribunal records remain the system of record; no duplicate parallel docket is introduced.
