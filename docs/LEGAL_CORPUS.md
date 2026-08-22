# Noocratic Legal Corpus Engine

## Milestone

The Legal Corpus Engine establishes the first machine-readable authority register for NEO System.

It is intentionally provenance-first: a document can be preserved as a Temple or Noocratic authority record without every proposition inside that document being treated as independently verified external law.

## Core rules

1. **Historical source immutability** — original bulletins, letters patent, canons, constitutions and resolutions are locked after ingestion.
2. **Addenda, never silent rewrites** — later interpretation, correction, historical verification or doctrinal development receives a new authority ID linked to the original.
3. **Authority-layer separation** — Divine, Ecclesiastical, Noocratic Constitutional, Administrative, Historical, United States and International authorities remain distinguishable.
4. **Verification state** — SOURCE_SUPPLIED, PRIMARY_SOURCE_VERIFIED, PARTIAL or UNVERIFIED is recorded independently from internal authority status.
5. **Authority graph** — records can point to parent instruments, resolutions, bulletins, addenda and related sources.
6. **Source fingerprints** — `sha256Fingerprint()` is available for canonical source-text hashing when full source text is ingested.

## Seed register

The first seed includes:

- Divine Constitution & By-Laws
- Holy Temple Canon / Moorish Templist Canon Codex
- Papyrus Atlan Noonebu / Doctrine of Recovery
- World Temple Letter Bulletins 1–10
- House of Crowns Resolutions RS001–RS0010

The seed stores metadata and summaries only. Full archival text should be ingested in a later content-storage milestone with a SHA-256 fingerprint and immutable object/version record.

## IDs

Examples:

- `NLC-CON-001` — constitutional instrument
- `NLC-CAN-001` — canon
- `NLC-AP-001` — Atlanian Papyrus / Recovery Doctrine
- `NLC-BUL-001` through `NLC-BUL-010` — World Temple Letter Bulletins
- `NLC-RS-001` through `NLC-RS-010` — House of Crowns resolutions

## Search API

`searchCorpus(records, query)` supports:

- free-text search
- authority-layer filters
- status filters
- verification filters
- tag filters

`getAuthorityGraph(id, records)` returns the selected record plus linked parent, child and cross-reference authorities.

`corpusStats(records)` returns record, immutability and verification counts.

## Historical record policy

The engine does not use Git history alone as the archival model. Git is development provenance. Corpus immutability is an application rule: once a historical source record is accepted, the source object is locked and any later material must be a separately identified addendum, authority note or superseding instrument.

## Next implementation

The next Corpus increment should add:

- full-text source objects
- SHA-256 fingerprints at ingestion
- addendum creation workflow
- source URL / file provenance
- signed registry exports
- Tribunal issue-to-authority citations
- authority verification queue
- source comparison / discrepancy notes
