# NEO-NPP-002 — GISD LMS / NEO Algo Integration Contract (Review Gate)

## Existing interfaces inspected
- `apps/gisd/curriculum.ts` defines 144-degree learner records, Temple Degree 36 Rekai threshold, assignments and source boundary.
- `apps/gisd/gissNeoLms.ts` defines portfolio evidence and internal learner terminology.
- `data/neo-sync/noology-gisd-canonical.json` preserves Rekai doctrine and source-integrity requirements.

## Proposed ingest
Use `data/noology/noologist-patron-program.json` as a **draft, read-only curriculum registry**, not a live student database. Join by program ID, not by replacing or overwriting existing Temple Degree records. A 30-day completion does **not** confer any Temple Degree or Holy Order automatically. The existing 36° Major Lesson 1 Rekai threshold is a separate prerequisite/entitlement, to be verified by Temple authorities.

## Required interfaces before activation
1. GISD LMS: curriculum view, instructor-assigned Templist enrollment, daily progress, portfolio evidence, consent and accessibility accommodations.
2. NEO Algo: retrieve program-defined doctrine with explicit SOURCE_SUPPLIED_DOCTRINE classification; do not present symbolic claims as empirical findings.
3. NEO Oracle: read-only program question answering with source citations and clear boundaries around medical/linguistic claims.
4. NEOsync: versioned source hashes and approval log; corrections append, never silently rewrite source.
5. Certificates: verified instructor and Temple approver, separate signed issuance, revocation and audit trail; Ankh / emerald-green artwork is design-only until reviewed.

## Authorization matrix
- Visitor: view approved public brochure only.
- Enrolled Templist: view own lessons and own progress.
- Assigned instructor: review only assigned learners; no self-issuance of certificates.
- Temple approver: approve/reject internal completion credential with audit evidence.
- System administrator: manage technical access, not alter learner attestations without a recorded correction.

## Acceptance tests (not yet executed)
- Exactly 30 unique consecutive days; no missing or duplicate lessons.
- Holy Orders mapping: Sage 1–2, Magi 3, Mystic 4–5, Sorcerer 6–9; both Mystic and Sorcerer are Level 3 per current directive.
- Enrolling a participant does not change 144-degree standing.
- Unauthorized user cannot access another participant's records.
- Missing consent prevents practice participation; missing instructor review prevents credential issuance.
- Nootropics educational only; no dosage or treatment advice.
- Revoked instructor cannot approve or issue records.
- Production remains off until privacy, legal, safeguarding and Temple review.

## Release decision
**DOCUMENTATION / STRUCTURED DATA PREPARED; RUNTIME INTEGRATION NOT IMPLEMENTED OR TESTED.** No live enrollment, billing, client data storage, medical practice, certification or deployment is authorized by this change.
