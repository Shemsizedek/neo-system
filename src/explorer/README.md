# NEO Explorer / NEO DEX

NEO Explorer is the financial-intelligence module for the NEO System. NEO DEX is its Bitcoin/Counterparty decentralized-market workspace.

## Core model
- Bitcoin: settlement foundation
- Counterparty: issuance, ownership, transfers and decentralized order primitives
- Orange Chip™: NEO asset-classification and registry layer
- CES: community-liquidity/data adapter
- XCP DEX: reference market and Counterparty UX/data adapter
- External exchanges: venue-specific market adapters
- NEO Prime: source-attributed intelligence and synthesis
- NEO Algo: reasoning, risk, provenance, confidence and approval-gating kernel

Orange Chip™ foundation address: `1Ky2wRYYrJzqdQJH64F7TR98fqLxJs7LK8`

A token record is not automatically treated as proof of an operating company, security, credit claim, royalty, fund interest, warrant, right, or other off-chain legal/economic interest. Store those claims separately with documentation and verification status.

## NEO Algo integration

`neoAlgoAdapter.ts` converts attributed market observations into NEO Algo missions. Market analysis uses the human 777 → 888 → 999 cycle by default:

1. **777 / grounding** — evidence, venue, status, context and constraints.
2. **888 / synthesis** — reconcile market sources, conflicts, confidence, practicality, ethics and risk.
3. **999 / resolution** — return the best-supported recommendation with provenance.

Missing or illustrative market data is never promoted to verified price evidence. Cross-venue price divergence remains attributed to each source. Financial execution is sent to NEO Algo as a consequential `financial_transfer`, which requires human approval before signing or broadcast.

The current implementation is a UI/data-model foundation. Live signing, custody, trade submission and transaction broadcast are intentionally disabled until an approved Bitcoin/Counterparty wallet and transaction layer is integrated.
