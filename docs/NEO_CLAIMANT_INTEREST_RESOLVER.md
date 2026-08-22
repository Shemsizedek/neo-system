# NEO Claimant & Beneficial-Interest Resolver

The resolver compares multiple claimants against the NEO Provenance Graph and NEO Title Auditor without collapsing distinct legal/economic concepts into one status.

## Distinct interest classes

- legal title
- beneficial interest
- custody
- control
- possession
- issuance
- succession
- economic benefit
- claim only

## Core sequence

1. Resolve each claimant by stable identifier or canonical graph node.
2. Infer documented interests from provenance edges.
3. Preserve asserted interests separately from documented interests.
4. Compare claimant intersections.
5. Flag compatible, nested, competing, and unresolved overlaps.
6. Generate primary-evidence requests for unresolved or competing claims.
7. Hand the report to human legal review for governing-law analysis.

## Integrity boundary

The resolver does not adjudicate title, probate, beneficial ownership, fiduciary status, wallet ownership, corporate authority, or priority. It identifies the documentary position of each claimant and the evidence still needed to resolve conflicts.
