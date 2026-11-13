# NEO System Project 144 — NOMNI USD 1:1 Objective Decision

Decision date: 2026-10-29
Decision status: USD-BACKED OBJECTIVE AUTHORIZED FOR RESEARCH AND DESIGN ONLY
Operational status: NO APPROVED STABLECOIN, NO GUARANTEED REDEMPTION
Repository owner: NEO System; evidence and authorizations: pending independent verification

## Approved objective — not active financial terms

Explore a program under which **1 NOMNI would be redeemable for 1 USD**, supported by verified **1:1 or higher legally eligible reserves** and enforceable issuer obligations, subject to independent legal, custody, accounting, and governance review. This is **not** a claim that NOMNI presently trades at $1, has reserves, or affords holders a right of redemption.

Existing NOMNI asset remains unchanged on Bitcoin/Counterparty. NEO Bank / Pay / FX may design NEO-controlled native Bitcoin/Counterparty rails. Coinbase is isolated as an outside, replaceable provider limited to independently confirmed native BTC and fiat services, not NOMNI custody, reserve custody, XCP integration, EVM/Base, stablecoins or NEOpass/NeoMask.

## Required launch gates

1. **Issuer:** Verify the actual legal issuing entity, jurisdiction, organizational authority and ownership; obtain specialist written legal advice and any required permitted payment stablecoin issuer approval (federal or state) BEFORE launch.
2. **Existing holder rights:** Determine whether all outstanding legacy NOMNI units would become redeemable, who bears those liabilities, how issuer obligations attach to the *existing* Counterparty asset, and whether that is legally and technically possible. No silent repricing, forced conversion, new token, or promised rights.
3. **Independent supply:** Obtain current Counterparty chain-derived total **outstanding issued NOMNI** (with divisibility and any provable burns/locks), reconcile all holder positions and treasury balances. Do not fund merely circulating market float. Record block height, timestamp, onchain asset ID, issuer and authenticated evidence.
4. **Reserve custody:** Independently confirm permitted reserve types, ownership, availability, ring-fencing/segregation, custodial controls and no double pledging; independently review evidence. The prototype accepts only reported USD cash for **illustrative arithmetic** and does not validate legal reserve eligibility. BTC, XCP, NOMNI, cbBTC, and any algorithmic support are not USD qualifying reserves by assumption.
5. **Coverage:** Model at least $1 of eligible reserves for every 1 outstanding NOMNI plus prudent liquidity/operating buffers; account for transaction costs and stress redemption. Avoid float math and ensure no cent underfunding.
6. **Redemption:** Establish legally enforceable redemption terms, required parties, timelines, fees, settlement mechanisms, cash delivery, customer-service and complaint procedure, sanctions constraints, bankruptcy treatment and emergency suspension rights (if lawful).
7. **Regulatory:** Document Bank Secrecy Act/AML, OFAC, KYC, reserve disclosure, attestations, audits, cybersecurity, third-party management, state money transmission, banking and digital-asset obligations applicable to actual activities.
8. **Technical controls:** Bitcoin/Counterparty remains the only asset protocol. Keep issuer and reserve operations under NEO-controlled signer and governance gates with hardware/threshold authorization, signed issuance/redemption approvals, reconciliation, monitoring, backup and kill switch.
9. **Reporting:** Develop month-end independent attestation and reserve-asset disclosures according to applicable issuer framework. Set operational daily monitoring with documented escalation for shortfalls. Do not treat this gate's placeholder evidence references as real attestations.
10. **Launch:** Separate affirmative launch decision after documented legal approval, certified outstanding supply, independently verified eligible reserves, service-provider due diligence, tests, disclosures and user opt-in as applicable.

## U.S. regulatory timing (verified 2026-10-29)

The OCC's October 21, 2026 final GENIUS Act implementation rule is effective **January 18, 2027**. The OCC reported applications and waiver requests were **not yet being accepted** pending final OMB approval at the time checked. Issuer approval and requirements depend on the actual structure; NEO's legal entity and eligibility are NOT verified here.

Primary sources:
- https://occ.treas.gov/news-issuances/bulletins/2026/bulletin-2026-50.html
- https://www.occ.gov/news-issuances/bulletins/2026/bulletin-2026-51.html
- https://www.occ.treas.gov/topics/charters-and-licensing/genius-act/index-genius-act.html
- https://uscode.house.gov/us/usc/119-124/t12/s5902/

## Software boundary, evidence, and audit

- Existing NOMNI metadata stays unchanged: server/crown-metadata/attachments/NOMNI/assets/NOMNI/info.json
- Existing NOMNI Bill is artwork/denomination evidence, **not a funded claim or reserve proof**.
- governance/nomni-stability/readiness.mjs blocks deployment/redeemable-public-claim flags regardless of apparent coverage.
- governance/nomni-stability/usd-reserve-gate.mjs performs **read-only, offline, illustrative** integer arithmetic from caller-reported amounts; NEVER labels reserves independently verified.
- All evidence references remain internal, without raw account numbers, credentials, customer information or real bank statements committed publicly.
- Coinbase isolation remains in separate unmerged PR #1266. No dependency on Coinbase for NOMNI issuance or reserves.

## Immediate blockers as of this decision

Issuer legal identity/authorization, verified NOMNI total outstanding supply, legal disposition of existing holders, segregated custodian reserve account, authenticated eligible reserve inventory, independent assurance, operational redemption terms, and compliance signoff are **not yet verified**.

The code must stay draft and fail closed. No issuance, metadata changes, NEO Bank live settlement or financial transactions are authorized by this decision.


## Discovery requiring explicit review — not audited protocol state

An independently operated third-party Counterparty explorer currently reports **900,000,000 NOMNI units, non-divisible, issuance locked**. This is not NEO's confirmed ledger audit. At $1 for every existing outstanding unit, the illustrative full backing amount would be **$900,000,000** before liquidity/capital buffers. The project must not represent that this reserve exists or assume that already-issued units can acquire new issuer obligations by changing metadata.

Sources: https://horizon.market/assets/NOMNI and official protocol reference https://apidocs.counterparty.io/.

**Required verification:** read-only GET /v2/assets/NOMNI from a synced Counterparty Core node, inspect total and outstanding supply, divisibility, lock status, issuer, and chain heights, then reconcile historical issuance/destruction, ownership and balances against a second independent indexer. Block issuance/redemption until complete. The reserve arithmetic code requires a reported non-divisible property and flags fractional supply submissions; no attestation has been obtained.

No supply figure in this document is a declaration of audited NOMNI supply or a reserve funding commitment.


## 2026-10-29 evidence update: single-node Counterparty onchain supply reconciled

This **supersedes the earlier third-party-explorer-only uncertainty** about the 900M supply in this document, but it does **not** supersede missing independent two-node verification or any reserve/issuer compliance block.

A live read-only request to the official Counterparty public mainnet node reported backend_height=counterparty_height=973747, server_ready=true, ledger_state=Following. Asset NOMNI (id 6195210) is non-divisible and locked with 900,000,000 issued units, first positive issuance at block 421813, and 5 valid issuance-family records in total. The other issuance-family records were zero-quantity description/lock/transfer changes. No destruction rows were returned. The complete 915-row holdings endpoint reconciled **894,011,631 wallet/UTXO balance units + 5,988,369 open dispenser escrow units = 900,000,000**.

This evidence proves neither a dollar peg nor liquid or legally eligible reserves. The issuer-authored NEO Index publication describes 800 million shares (historical offering concept), but the Counterparty creation was for 900 million; no later 100 million mint is evident in the returned history. Those 800 million shares may have a distinct legal meaning that must be resolved by the issuer.

The 2017 Noone Society Standard Benchmark Agreement language and later resolution propose a multi-asset benchmark; the newly selected USD-backed NOMNI design is an additional proposed program with potentially distinct legal rights. Both must be documented without substituting internal CES NMNI/V-Dollar book entries for fiat reserve assets.

Primary evidence memo: [STANDARD-BENCHMARK-EVIDENCE-REVIEW.md](./STANDARD-BENCHMARK-EVIDENCE-REVIEW.md). Machine-readable aggregate record: [PROTOCOL-SNAPSHOT-2026-10-29.json](./PROTOCOL-SNAPSHOT-2026-10-29.json). Testable offline validator: [counterparty-supply-audit.mjs](./counterparty-supply-audit.mjs). CES segregation validator: [ces-ledger-boundary.mjs](./ces-ledger-boundary.mjs).

**Unchanged restrictions:** no onchain change, no guaranteed redemption, no recognition of legal issuer authority, no independent reserve attestation, no Coinbase integration beyond proposed native BTC provider, and no public stablecoin marketing.
