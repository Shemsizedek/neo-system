# Provenance Graph test plan

1. Build a fused record with a stable accession identifier and confirm one evidence-record node is created.
2. Connect an entity to that record and confirm the edge preserves source hit IDs and authority tier.
3. Supply conflicting fused evidence and confirm edge status becomes `CONTESTED`.
4. Supply only generic `RELATED_TO` evidence and confirm the chain is not promoted to complete provenance.
5. Create a cycle A→B→A and confirm `CIRCULAR` chain status.
6. Remove a directed path between two nodes and confirm `BROKEN` with a missing-link message.
7. Confirm unresolved fusion entities remain listed in `unresolvedNodeIds`.
