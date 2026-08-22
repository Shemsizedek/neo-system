# NEO Tribunal Evidence Packets — v0.5

This milestone adds file-backed evidence integrity controls and exportable internal opinion packets to the Inner Bar Temple Tribunal module.

## Capabilities

- Browser-side SHA-256 hashing of attached evidence files.
- File metadata on exhibit records: filename, media type, size and fingerprint.
- Chain-of-custody event appended when a file is hashed.
- Cryptographic custody receipts whose receipt digest binds the exhibit ID, evidence fingerprint, actor, timestamp and receipt statement.
- Findings of fact with an explicit burden/review standard.
- Finding validation against admitted exhibits and case-attached Corpus citations.
- Opinion packet manifest containing findings, citations, exhibits and evidence fingerprints.
- SHA-256 fingerprint for the packet manifest.
- Human-readable packet preview for downstream export/rendering.

## Burden standards

The engine supports PREPONDERANCE, CLEAR_AND_CONVINCING, BEYOND_REASONABLE_DOUBT and INTERNAL_EQUITY_REVIEW as configurable analytical labels. The software does not decide which standard is legally required in an external jurisdiction.

## Integrity model

Historical Corpus sources remain immutable. Evidence files are hashed from their actual bytes in the browser. The application records only metadata and fingerprints in the current front-end model; persistent encrypted object storage is a later milestone.

## Boundary

The packet is an internal records and analytical bundle. It preserves provenance and review links but does not itself create external jurisdiction, legal recognition, arrest authority, property title or binding effect on third parties.

## Next milestone

Persistent case storage, encrypted evidence object storage, role-based access control, audit signatures, packet PDF generation, and docket-level filing/version history.
