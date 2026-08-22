# NEO CFO — Finance Command Foundation

NEO CFO is the finance command layer for Honorable Larry Shelton and the Larry Shelton Estate. It coordinates the existing NEO Books accounting core, LEDGER treasury intelligence, STEWARD family-office administration and NEOsync approval workflow.

## Authority profile

- Principal and human trustee: Honorable Larry Shelton
- Estate: Larry Shelton Estate
- Operating agent: NEOsync
- Internal designation: Head Trustee Agent

The designation authorizes internal coordination, analysis, recordkeeping and decision preparation. It does not make software a natural person, corporate trustee, custodian, regulated adviser, authorized signer or substitute for legal fiduciary accountability.

## Workstreams

1. Cash Command
2. Strategic Bill Pay and Autopay Review
3. Credit Builder
4. Investment Office
5. Trading Desk Risk Control
6. Estate Books and Trustee Reporting

## Control model

All external financial actions are approval-gated. The system may calculate, prioritize, forecast, draft and reconcile. An authorized human or institution must execute money movement, trades, account changes, credit applications, distributions, borrowing, filings and signatures.

No balance, debt, credit score, holding, valuation or income figure is treated as actual until supported by an approved record. The initial dashboard therefore displays `UNCONFIGURED` rather than fabricated demonstration wealth.

## Runtime

- `src/cfo/policy.ts` contains the authority profile, workstreams, approval gates and auditable bill-priority function.
- `src/cfo/CfoDashboard.tsx` provides the initial command-center interface.
- `agents/cfo/` defines the NIA-011 operating agent and canonical prompt.
