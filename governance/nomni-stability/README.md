# NOMNI Stability Readiness — Project 144

**Decision status:** DRAFT, NOT ISSUANCE AUTHORIZATION.

NOMNI remains the existing **Bitcoin/Counterparty asset and NEO world currency/unit of account**. Do not reissue, wrap, move, or bridge NOMNI, and do not change the public metadata or NOMNI Bill while this work is under review.

A stablecoin is not simply an asset that has a denomination, declared price, or linked bill artwork. This gate assesses whether NOMNI might later qualify for a separately approved, explicitly defined stablecoin program.

## Open decisions
- **Decision (2026-10-29):** Research **proposed USD 1:1 backing** for NOMNI, subject to written issuer authorization, verified eligible reserves and enforceable redemption terms. This is NOT an active peg; see `USD-BACKING-DECISION.md` and `usd-reserve-gate.mjs`.
- Identify the legal issuer, liabilities, beneficial ownership, jurisdiction, custody, circulation and issuance authorities.
- Audit current Counterparty NOMNI supply/locks/issuance history and reconcile to liability and independent reserve balances.
- Document whether every existing NOMNI is eligible for the same rights. Do not arbitrarily promise redemptions on legacy holders.
- Obtain independent legal review of U.S. GENIUS Act requirements and relevant state rules; for an eligible USD payment stablecoin, secure required authorizations, 1:1 reserves, permitted reserve custody, risk management and disclosure.
- Obtain written rights, timelines, redemption instructions, prohibited use cases, attestation cadence, reserve controls, and independent verification.

## Safeguards
`readiness.mjs` accepts only evidence pointers and **cannot approve launch**, issue assets, represent reserve custody or turn on redemption. Even with all fields supplied, output remains `pending-independent-legal-and-reserve-verification`.

`assertNoPrematureNomniStablecoinClaim` rejects public metadata claims of a peg, backing, redemption guarantee or stablecoin designation prior to approvals.

No Coinbase NOMNI custody or listing is presumed. Coinbase "Counterparty Transfers" means off-chain Coinbase institutional transfers, **not Counterparty XCP**. Under Project 144, Coinbase stays BTC-only and provider-isolated; NEO handles NOMNI/XCP natively using its Bitcoin/Counterparty application.

## Source and verification points
- Existing asset metadata: `server/crown-metadata/attachments/NOMNI/assets/NOMNI/info.json`
- Existing NOMNI bill record: `server/crown-metadata/attachments/NOMNI/assets/NOMNI/bill-1.json`
- NEO Pay wallet: `apps/neopay/README.md`
- Existing provider isolation: PR #1266 `integrations/coinbase`
- Counterparty documentation: https://docs.counterparty.io/docs/basics/assets/counterparty-assets/
- U.S. OCC rule: https://occ.treas.gov/news-issuances/bulletins/2026/bulletin-2026-50.html
- New York DFS guidance: https://www.dfs.ny.gov/industry_guidance/industry_letters/il20220608_issuance_stablecoins
- Coinbase institutional Counterparty Transfers: https://help.coinbase.com/en/exchange/crypto-transfers/counterparty-transfers

Tests: `node --test governance/nomni-stability/*.test.mjs`.
