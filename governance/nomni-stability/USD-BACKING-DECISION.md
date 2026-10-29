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
