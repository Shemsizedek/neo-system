# NEO-TOKENWORKS-001 — NOMNI Collateral Verification & Surety Escrow Gate

Status: DESIGN / NON-EXECUTING / REVIEW REQUIRED
Scope: Bitcoin mainnet + Counterparty NOMNI only. Do not use an Ethereum TokenWorks product.
Owner: NEO Tokenworks / Crown Chain
Date: 2026-10-31

## Objective
Provide a read-only, independently reproducible evidence and approval workflow for a NOMNI pledge considered by a licensed bail surety. The workflow must not infer court acceptance, dollar value, custody, or audit assurance from a token listing or wallet balance.

## Existing baseline
- docs/NEO_TOKENWORKS.md: ORIGIN_SANDBOX shared access and escrow planning.
- server/neo-tokenworks/tokenworks.mjs: escrow compose/sign/broadcast/mainnet all disabled; address proof challenge exists, signature verification pending.
- docs/NEO-G133-INSTITUTIONAL-CREDIT-CONTROL.md: credit authorization metadata, haircut and margin checks; no funding.
- Existing Crown Chain: evidence chain/digest integration must be independently confirmed prior to release.

## Five-part verification
1. **Identity and protocol**: canonical NOMNI asset ID, issuance history, Bitcoin/Counterparty network height, independent node/indexer cross-check and signed, time-bounded snapshot.
2. **Control and legal ownership**: NEO Mask noncustodial challenge-response proof, with BIP-322 or applicable verified method, legal/beneficial holder identity and liens. Neither a wallet signature nor a chain address alone proves legal title.
3. **Accounting**: NEO Books and NEO Ledger reconcile on-chain movements and off-chain claims; segregate issuer balances, treasury holdings, CES credits, external reserves, liabilities, and pledged balances. Never equate issuance supply with holdings or NAV.
4. **Market**: independent NOMNI/BTC executed trades, live executable bid depth, spread, volume, BTC/USD source and timestamp, minimum confirmed depth and maximum acceptable slippage by pledge quantity. No bid: eligible value unavailable/zero unless separately approved support exists.
5. **Legal / surety**: independently scoped CPA procedures, valuation specialist report when necessary, counsel's rights/classification/perfection analysis, surety terms and acceptance, court/jurisdiction review.

## Proposed lifecycle (no implementation of fund movement in this gate)
DRAFT -> EVIDENCE_COLLECTING -> INDEPENDENT_REVIEW -> SURETY_REVIEW -> COURT_REVIEW -> APPROVED_FOR_CONTROL (conditional) -> PLEDGED (future authorized execution) -> RELEASED or FORFEITED (future authorized execution).

Every transition records actor role, evidence digest, timestamp, approval reference, and idempotency key. An exception or stale source transitions to HOLD, never auto-approves.

## Tokenworks escrow policy
- Shared-access entitlement **cannot** substitute for seizure-resistant on-chain or legally enforceable third-party custody.
- A block-height timeout cannot automatically discharge a bail bond. Court/surety discharge or forfeiture instructions govern release.
- No seed phrase or private-key ingestion; a future release requires an external signer, policy-bound multisig/custodian, and independent legal review.
- Regtest must demonstrate pledge, attempted unauthorized spend, reorg rollback, authorized release, forfeiture, recovery, and dual-indexer consistency before any mainnet capability.
- If direct Counterparty escrow is technically unsupported for the asset, propose an explicitly disclosed qualified custody/control arrangement rather than claiming that a time lock works.
- No collateral rehypothecation, lending, fractional sale, or third-party use without separate agreements, licensing analysis and approvals.

## Professional read-only portal
Portal roles: holder, independent accountant, valuation professional, legal counsel, licensed surety, court-authorized reviewer and internal risk. External reviewers must independently verify source records without trusting NEO-hosted assertions. 
Exports: network facts with block heights / txids, proof-of-control verification result, reconciliations, signed accountant report (if actually provided), live/stale market-depth report, legal exceptions, lien/custody references, cryptographic hashes and audit chronology.
Private records: encrypted storage, least privilege, scoped disclosure, access audit log, no public PII or key material.

## Fail-closed release criteria
- Authenticated complete evidence and no unresolved ownership conflicts.
- Two independent reproducible chain sources, confirmation policy and reorg handling.
- Independent review report identified by issuer, qualifications, engagement scope and date. Do not label NEO analytics an independent audit.
- Market liquidation model has grounded bid depth at the pledged size; valuation and haircut signed by responsible reviewer.
- Pledge terms specify control, default, forfeiture, priority, sanctions/KYC as applicable, disposition and court discharge.
- Licensed surety has affirmatively accepted collateral and applicable court approvals are documented.
- Production custody and signing disabled until separately authorized release.

## Public disclosure
Blockchain verifies network events, not automatically off-chain ownership, reserve backing, financial statement completeness, value, or bail eligibility. NOMNI/BTC listing or indicative quotes do not guarantee executable liquidity. NEO Tokenworks planning is not escrow, a custody service, securities registration, independent CPA opinion, surety bond, court approval, or authorization to move funds.

## Test plan for follow-on engineering
- Invalid/expired signature, replay, wrong network, wrong asset, stale quote, negative/zero depth and inconsistent indexers must HOLD.
- Reject undercollateralization and over-limit concentration.
- Immutable approval audit; no privileged state transition without two-party control.
- Demonstrate professional read-only export can be independently reproduced.
- Assert existing compose/sign/broadcast flags remain false in this design gate.
