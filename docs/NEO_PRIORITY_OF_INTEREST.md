# NEO Priority-of-Interest Engine

This layer consumes the Provenance Graph, Chain-of-Title Audit, and Claimant & Beneficial-Interest Resolver and produces an interest-specific documentary priority matrix.

It evaluates documentary status, chronology, instrument/relationship evidence, capacity/authority evidence, provenance continuity, competing-claim load, and unresolved title defects.

## Guardrails

- Priority is evaluated separately for legal title, beneficial interest, custody, control, possession, issuance, succession, economic benefit, and claim-only positions.
- Earlier chronology is evidence, not an automatic legal-priority rule.
- Custody, control, possession, filing, issuance, or blockchain activity is not silently converted into ownership.
- Missing governing law, jurisdiction, perfection/recording rules, probate rules, trust rules, notice rules, or operative instruments remain unresolved.
- Scores describe documentary position for research and review; they are not judgments, liens, awards, or adjudications.

## Pipeline

Evidence Fusion -> Provenance Graph -> Title Auditor -> Claimant Resolver -> Priority-of-Interest Engine -> Governing-Law Review -> Factology / 9-Ethereal Review / Neopedia
