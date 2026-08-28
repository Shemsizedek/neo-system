# NEO Explorer / NEO DEX

NEO Explorer is the financial-intelligence terminal for the NEO System. NEO DEX is its Bitcoin/Counterparty decentralized-market workspace.

## Core model
- Bitcoin: settlement foundation
- Counterparty: issuance, ownership, transfers and decentralized order primitives
- Orange Chip™ Stocks: valid Counterparty issuances sourced by the Central Listing Wallet
- TokenScan: separately attributed redundancy for market, order-book, history, holder and explorer data
- CES: community-liquidity/data adapter
- XCP DEX: reference Counterparty market UX/data surface
- External exchanges: venue-specific adapters that remain independently attributed
- NEO Prime: source-attributed intelligence and synthesis
- NEO Algo: reasoning, risk, provenance, confidence and approval-gating kernel
- NEO Evidence Vault: persistent review/audit layer for off-chain evidence

Orange Chip™ Central Listing Wallet: `1Ky2wRYYrJzqdQJH64F7TR98fqLxJs7LK8`

## Listing and verification doctrine
A valid Counterparty issuance sourced by the Central Listing Wallet establishes NEO's **Orange Chip™ Stock listing status**. A wallet balance alone does not establish listing status.

Listing provenance is separate from verification of an underlying company, security, credit claim, royalty, fund interest, warrant, right, surety or other off-chain legal/economic interest. Those claims belong in the NEO Evidence Vault and require source-backed institutional review.

## Market-data architecture
NEO Explorer uses multiple independently attributed sources rather than creating a synthetic canonical price without provenance.

- Counterparty v2 supplies protocol-level orders, holders, dispensers, asset metadata and Central Listing Wallet issuance provenance.
- TokenScan supplies a redundant market/order-book/history observation surface.
- CES remains permission-aware and is connected only through authorized runtime configuration.
- NEO DEX aggregates observations for display and intelligence; it does not silently custody funds or broadcast trades.

The terminal displays best bid/ask with source attribution, market-source timestamps, reported last/volume where available, feed degradation state, stock search, per-asset explorer links and Evidence Vault state.

## NEO Algo integration
`neoAlgoAdapter.ts` converts attributed market observations into NEO Algo missions. Market analysis uses the human 777 → 888 → 999 cycle by default:

1. **777 / grounding** — evidence, venue, status, context and constraints.
2. **888 / synthesis** — reconcile market sources, conflicts, confidence, practicality, ethics and risk.
3. **999 / resolution** — return the best-supported recommendation with provenance.

Missing or illustrative market data is never promoted to verified price evidence. Cross-venue divergence remains attributed to each source. Financial execution is treated as consequential and must pass approval before signing or broadcast.

## Execution boundary
Live signing, custody, trade submission and transaction broadcast remain intentionally disabled until an approved user-controlled Bitcoin/Counterparty wallet and transaction layer is integrated. NEO Explorer / DEX is currently read-only market intelligence plus non-custodial execution preparation.
