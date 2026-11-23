# NEO-ACT-001 — World Treasury Actuarial Intelligence Foundation

**Status:** Draft implementation for review; read-only model. Not a production release or actuarial opinion.

## Charter
NEO Actuary is the World Treasury's evidence-based actuarial and risk-intelligence service. It provides reserve, liability, solvency and liquidity projections for governance review. It does not authorize capital transfers, token issuance, insurance underwriting or asset reclassification.

## Domains
1. Treasury balance sheet, fund restrictions, liquidity ladders, reserve adequacy and solvency.
2. Currency/token exposures (BTC/XCP/NOMNI/NEOCASH), issuer versus holder ledgers, redemption assumptions, FX normalization with price timestamp/source.
3. Market, credit, counterparty, concentration and scenario analysis.
4. Asseturance claim frequency/severity/IBNR and reinsurance analysis, contingent on claims data.
5. Benefits, annuities and longevity assumptions, contingent on demographic data.
6. Covenant-driven trust obligations, distributions and asset-liability matching.
7. Evidence provenance: on-chain transaction / wallet balances, contractual ownership, legal entitlement, custody and valuation are **separate** verification categories.

## Inputs and controls
- Canonical source: existing `src/treasury/treasurySystem.ts` (fund segregation and governance boundary).
- Prospective adapters: NEO Scan, Crown Chain Evidence Vault, Nibiru Reserve, NEO Bank, NEO FX and World Treasury account inventory.
- Every financial row requires record ID, denomination, units, as-of date, evidence reference and independent verification status.
- Reject mixed units absent documented exchange-rate source and timestamp; keep unsupported price or liability figures as NOT PROVIDED.
- Restricted trust funds cannot automatically cover general World Treasury liabilities.
- Require role-based read access, versioned assumptions, model validation, authorization and audit history before production.
- Never present issuer-controlled wallets as beneficially owned World Treasury assets without affirmative supporting authority.
- Internal natural-law governance does not displace applicable externally binding financial, insurance, tax, trust or securities requirements.

## First executable slice
`server/neo-actuary/engine.mjs` is a deterministic pure function using integer minor units and basis-point stresses. Returns raw balance-sheet net position, stressed balance sheet, coverage ratio and shortfall. All amounts must be **verified** and same-currency. No live feeds, persistence, pricing engine, actuarial reserve certification, deployment or signed attestation are included.

## Next gate: NEO-ACT-002
Evidence-backed connectors, multi-asset price provenance, restricted-fund partitioning, cash-flow duration, expected/percentile loss modeling, stress suite, versioned assumptions and audit-ready reporting. Human approval required before any public disclosure or production activation.

## Testing
`node --test server/neo-actuary/engine.test.mjs`
