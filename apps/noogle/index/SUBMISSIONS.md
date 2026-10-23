# Noogle Community Source Submission Flow

Community and Indigenous sources are welcome, but submission is not automatic verification.

## Required fields
- public source URL
- submitter identity or organization name
- attribution statement
- source class
- community name when community authority is claimed
- consent to index

## Review states
1. `submitted` — received but not indexed.
2. `validated` — URL and required metadata are structurally valid.
3. `attributed` — community/source attribution is recorded.
4. `approved` — second-person review is complete, but the source is **not** indexed until separately published.
5. `indexed` — source is included in the Noogle corpus following a reviewed and auditable publication release.
6. `disputed` — competing attribution or factual interpretation is documented.
7. `removed` — excluded for access, safety, provenance, consent, or quality reasons.

A community source may carry contextual authority for its own terminology, language, self-description, and cultural representation. That authority is displayed with attribution and does not silently overwrite contradictory primary records or independent scholarship.

## KI-014 controlled write boundary

An opt-in NEOpass-authenticated moderation ledger is staged under server/neo-knowindex and is disabled in production by default. It records submissions and reviews without publishing source text or changing the public index. The existing public GitHub-issue submission path remains available. A contributor's claimed rights must be independently checked before any indexing, particularly for linked Drive, YouTube, or restricted materials.
