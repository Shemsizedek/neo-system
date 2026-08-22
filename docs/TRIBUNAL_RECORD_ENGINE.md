# Inner Bar Temple Tribunal — Record Engine v0.4

## Purpose

This milestone turns the Tribunal module from a citation demonstration into a structured internal case-record engine.

## Evidence and Exhibit Registry

Every exhibit receives a stable exhibit ID, evidence kind, offering party, status, integrity state, description, tags and chain-of-custody events. The registry distinguishes offered, admitted, excluded and review-required material.

Evidence status is not the same thing as truth. Admission means the item is part of the internal record; factual weight remains an adjudicative question.

## Chain of Custody

Custody events record receipt, hashing, review, admission, exclusion, transfer and notes. Later milestones can attach file hashes and signed receipts to these events.

## Opinion Builder

The opinion model contains seven sections:

1. Question Presented
2. Jurisdiction and Scope
3. Findings of Fact
4. Authorities
5. Analysis
6. Conclusion
7. Internal Disposition

Sections can reference proposition-level Corpus citations and admitted exhibits. Validation checks that cited authorities belong to the case and that exhibit IDs exist in the record.

## Addendum Lineage

Corpus source objects now support `parentSourceId` and `addendumFor`. Historical originals remain immutable. A later addendum is a separate source object linked to the historical source rather than an overwrite.

The first lineage metadata is seeded for Bulletin No. 5 and its Indigenous Recovery Doctrine addendum record. This is lineage metadata only; it does not silently insert missing full text.

## Scope Boundary

The Tribunal is an internal records, research, analysis and adjudicative-workflow system. It does not by software declaration create external governmental jurisdiction, police or arrest power, property title, diplomatic recognition, or binding effect on persons outside an applicable lawful agreement or recognized jurisdiction.

## Next Increment

- file-backed evidence objects and automatic hashing
- signed custody receipts and reviewer audit log
- full-text ingestion for remaining supplied historical instruments
- findings-of-fact builder with burden/standard fields
- exportable internal opinion packet and authority sheet
