# NEO-ACT-002 — World Treasury reserve intelligence

Status: development-only extension to draft PR #1213; no production data connected.

## Implemented
- Verified source-linked records scoped to one explicit currency.
- Fund-level segregation for unrestricted versus restricted balances.
- 7/30/90/365-day cumulative liquidity ladder and conservative shortfall.
- Reject duplicate IDs, missing evidence, mixed denominations and past-due items.
- Preserve Actuary 001 aggregate model separately from available liquidity.

## Important model caveats
- This is a **maturity schedule**, not predictive insurance actuarial modeling.
- Restriction authorization needs legal/contractual purpose mapping and human review.
- Missing records do not imply zero assets or liabilities.
- Values here are not independently verified by the software. The `verified` flag is a trusted-upstream assertion requiring authenticated provenance controls before live use.
- No pricing feed, FX translation, signature verification, wallet ownership determination, multisig signer, automatic asset mapping, persistence or deployment has been implemented.
- Do not use as a public Treasury certification or investment disclosure.

## Required next release steps
1. Define signed adapter manifests and independent verification for Crown Chain, Counterparty and custodial records.
2. Normalize BTC/XCP and issued assets with timestamped market-source quotes; segregate balances by beneficial owner and custodian.
3. Build maturity aging, fund restrictions/purpose eligibility, exposure classes, policy-based scenario matrices and full backtesting.
4. Wire dashboard to authenticated, read-only service and audit trail. Run CI and security review.
5. Obtain formal Treasury authorization before any publication.

## Test
`node --test server/neo-actuary/*.test.mjs`
