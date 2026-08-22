# NEO Provenance Graph Engine

The NEO Provenance Graph Engine converts fused evidence into directed, typed provenance chains.

## Purpose
It represents origin, authorship, filing, issuance, assignment, transfer, succession, control, custody, benefit, derivation, citation, corroboration, contradiction, supersession and chronology without collapsing these distinct relationships into generic association.

## Chain states
`COMPLETE`, `BROKEN`, `CIRCULAR`, `ASSERTED_ONLY`, `CONTESTED`, and `INSUFFICIENT_DATA`.

## Integrity rules
- Every edge preserves its underlying fused-record and source-hit identifiers.
- A directed evidentiary path does not itself establish legal title, ownership, liability or ultimate truth.
- Asserted, inferred and contested links remain visible and reduce chain-completeness scoring.
- Circular paths are detected and flagged rather than counted as independent corroboration.
- Missing links become research tasks, never silently inferred conveyances.
- Stable identifiers and dated instruments are preferred over symbolic or lexical resemblance.

The engine is designed to feed the Autonomous Inquiry Engine, Neopedia dossiers, succession analysis, chain-of-title review and future graph visualization.
