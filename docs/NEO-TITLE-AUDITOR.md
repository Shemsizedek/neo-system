# NEO Chain-of-Title Auditor

The NEO Title Auditor converts the Evidence Fusion + Provenance Graph layers into a focused origin-to-present audit for land, intellectual property, cultural property, estates, trust interests, token/digital assets, financial instruments, offices/titles, doctrine/knowledge, and archival records.

## Audit flow

1. Resolve the subject by stable identifier before fuzzy labels.
2. Identify the asserted or evidenced origin node.
3. Identify the asserted or evidenced present position.
4. Trace only directed title/provenance relations.
5. Enumerate parties and their distinct roles.
6. Enumerate conveyance/succession/custody steps with source records.
7. Preserve contested, asserted, inferred, and unresolved links.
8. Classify defects and missing instruments.
9. Generate follow-up evidence questions.
10. Return a completeness/status report for human legal review.

## Key distinctions

The auditor deliberately does not collapse the following concepts:

- possession vs ownership
- custody vs beneficial interest
- filing vs validity
- issuance vs title
- control vs ownership
- authorship vs registration
- origin vs later codification
- blockchain event vs off-chain legal right
- provenance evidence vs adjudicated legal effect

## Statuses

- CLEAR_DOCUMENTED_CHAIN
- DOCUMENTED_WITH_GAPS
- CONTESTED_CHAIN
- ASSERTED_CHAIN_ONLY
- CIRCULAR_OR_DEPENDENT_CHAIN
- INSUFFICIENT_EVIDENCE
- NO_CHAIN_FOUND

## Defects

The engine can flag missing origin instruments, missing conveyances, unverified assignments or succession, conflicting claimants/identifiers/dates/custody, asserted-only links, circular provenance, broken chains, unresolved beneficial interests, authority/capacity defects, and general provenance gaps.

## Integrity boundary

The Title Auditor is an evidentiary and provenance engine. It does not itself adjudicate ownership, lien validity, probate rights, sovereign authority, intellectual-property ownership, trust rights, or other legal effect. Those determinations require the governing law, jurisdiction, operative instruments, and competent legal determination.
