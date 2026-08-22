# NEO Corpus Ingestion + Tribunal Citation Integration

## Milestone

This increment connects the Noocratic Legal Corpus to the Inner Bar Temple Tribunal case workflow.

## Source object model

Authority metadata and source content are separate objects. A Corpus authority may have multiple sources: historical transcription, URL locator, PDF/archive object, or later addendum. This prevents later commentary from overwriting an original instrument.

Every source object records:

- source ID
- authority ID
- source kind
- provenance (`USER`, `ARCHIVE`, or `EXTERNAL`)
- immutable flag
- integrity state
- optional source text
- optional locator
- optional SHA-256 fingerprint

`SOURCE_SUPPLIED` remains distinct from `PRIMARY_SOURCE_VERIFIED`. Ingestion is not external legal recognition.

## Integrity workflow

`UNHASHED → HASHED → REVIEWED`

The current browser helper can SHA-256 fingerprint text or locator payloads. Production ingestion should store the fingerprint with the immutable source object and record the reviewer and review timestamp in an append-only audit event.

## Tribunal citation chain

Every legal proposition used by a Tribunal case can be linked as:

`Claim → Citation → Corpus Authority → Source Object`

A citation is valid only when its source object is linked to the cited authority. The Tribunal authority matrix exposes this chain for review.

## Case lifecycle

`INTAKE → JURISDICTION_REVIEW → NOTICE → EVIDENCE → RECORD_CLOSED → OPINION → DISPOSITION`

The workflow distinguishes the record from the final opinion. Closing the record does not automatically create a disposition.

## Historical-record rule

Historical bulletins, constitutions, canons, letter patents and resolutions remain immutable. Corrections, later legal analysis, verification findings and new doctrine are separate addenda or authority notes.

## Current seeded source objects

The milestone includes source objects for:

- Divine Constitution & By-Laws — Act 1 transcription
- Bulletin No. 7 source locator
- Bulletin No. 8 source locator
- Bulletin No. 9 source locator
- Bulletin No. 10 article-heading transcription

These are deliberately limited to source material already supplied to the NEO working record. Partial transcriptions are labeled as partial; missing text is not inferred.

## Scope boundary

The software is an internal records, research and adjudicative-workflow system. It does not itself create governmental court jurisdiction, arrest power, police authority, military authority, diplomatic recognition, property title, banking authority or external legal recognition.

## Next increment

1. Full-text ingestion for all supplied Bulletins and constitutional instruments
2. Addendum registry with parent-child lineage
3. Verification queue and reviewer audit events
4. Signed/exportable case authority sheets
5. Case evidence object store and exhibit numbering
6. Opinion builder with proposition-level Corpus citations
