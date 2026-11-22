# NEO Debt Capitalization — Gate 1 Feasibility and Control Specification

**Project:** NEO-DCC-001 | **Date:** 2026-11-21 | **Status:** PROPOSED / SANDBOX ONLY / NO-GO for transactions  
**Owner:** NEO Finance and Risk (proposed) | **Commercial coordination:** NIA-013 NEO Deal Desk | **Legal review:** independent qualified counsel (unassigned)  
**Source request:** Evaluate financing and tokenizing enforceable debt claims, including crypto-denominated claims, and paying sellers without waiting for difficult collections.

## 1. Hypothesis and non-equivalence

A documented, transferable, enforceable claim may have a recoverable **economic** value below its face amount. A duly authorized lender may elect to advance funds against a diversified portfolio after legally effective collateral creation and perfection, diligence, and haircutting. That is **not** equivalent to instantly creating liquidity by labeling a debt a token. Neither a token, a Bitcoin broadcast, an internal tribunal record, nor an accounting entry alone creates enforceable title, an obligation, a credit facility, or market acceptance.

Distinct classes: (1) asserted claim, (2) validated enforceable claim, (3) acquired/assigned ownership, (4) modeled recovery, (5) verified eligible collateral, (6) signed lender commitment, (7) cleared funding, (8) realized collection. Maintain explicit transitions and evidence. Implement in harmony with docs/NOUS_ECONOMIC_VALUE_KERNEL.md; do not convert NOMNI modeled credit or claimed receivables into fiat assets by implication.

## 2. Transaction alternatives

**Option A — Purchase with third-party warehouse finance (preferred test case):**
1. Seller offers claim portfolio and proves documented rights, completeness, jurisdiction, and assignment permissions.
2. Legal/compliance team confirms validity, chain of title, limitation periods, disputes, consumer-protection obligations, privacy, sanctions, and security interests.
3. Independent valuation produces discounted, stressed collections minus expected legal/servicing expenses. A lender may establish eligibility, concentration limits, advance rate and reserves. **If there is no legally binding fundable lender commitment, advanceable cash = $0.**
4. Seller and buyer execute a *conditional* purchase/assignment and lender collateral package vetted by counsel. Require escrow/controlled settlement and completion of any necessary perfection/notice.
5. Finance provider funds closing escrow; escrow pays the seller when all closing conditions are satisfied; residual cash settles transaction costs/reserve according to signed documents.
6. Servicer collects lawfully; net collections flow to controlled collection account and repay senior lender first under documented waterfall, with independent reconciliation. Buyer retains residual upside/downside.

**Option B — Seller retains title and pledges receivables:** seller directly finances eligible receivables with an institutional lender; NEO supplies evidence and servicing software only, without representing that it owns the debts.

**Option C — Servicing on a fee/contingency basis:** NEO records/verifies and services claims for a contractually agreed fee, with no promised immediate seller cash-out.

**Not authorized:** obtaining seller assets under an unconditional promise to pay from future Bitcoin-mining yield, reusing seller collateral to fund trading, unsecured speculative yield bridging, automatic crypto collection, self-issued lending with no actual lender, or claiming title via token mint.

## 3. Illustrative economics only — NOT current assets or a quote

Example claim portfolio nominal face = $100,000.
- Scenario model of gross collections (risk-weighted and discounted): $25,000.
- Expected servicing/litigation/verification costs (present value): $7,000.
- **Illustrative stressed net recovery PV: $18,000.**
- Hypothetical lender advance cap 40% of stressed net PV: **$7,200**, provided a real eligible lender signs and funds; otherwise zero.
- Example seller closing payment cap: $6,500; remaining $700 reserved for verified fees/closing controls.
- If actual collections are zero, the lender and owner can incur losses; neither seller consideration nor mining gains is assured.
- Model separate downside/base/upside and sensitivity to recovery rate, time, disputes, defense costs, lender haircut, interest/carry and BTC price if denomination is BTC. No percentage is a recommendation or available offer.

Equation: `eligible_advance = min(lender_facility_available, max(0, stressed_net_recovery_PV) * lender_advance_rate, contractual_borrowing_base_limit) - required_reserves`; floor at zero. No reliance on receivable **face** value as automatically lendable.

## 4. Mining/yield proposal — separate research lane, OFF by default

Mining contracts, hash-rate rentals, cloud mining and high-return investments have counterparty, fraud, price, difficulty, fee, liquidity and loss risk. Seller consideration must not depend on speculative yield unless independently negotiated and legally reviewed as an explicit at-risk deferred payment; never market that as guaranteed or immediate cash. No seller trust/escrow funds may be diverted to an investment strategy. If NEO later evaluates BTC mining, it must use separately approved risk capital, not collateral proceeds or funds owed sellers, and undergo custody, regulatory, fiduciary and liquidity review. **Gate 1 authorizes no investment.**

## 5. Legal perimeter / external checks (not legal advice)

- Distinguish consumer debt vs commercial debt vs on-chain crypto contract claims; jurisdiction, debtor rights and enforceability differ.
- For covered consumer collections, counsel must analyze the FDCPA, CFPB Regulation F validation, disputes, prohibited practices and time-barred debt. Texas Finance Code Chapter 392 includes debt-buyer requirements and, for covered third-party debt collectors, a $10,000 surety bond; verify classification and other state law before operating.
- Analyze legal assignment, debtor notices, underlying contract restrictions, choice of law, title warranties, security-interest attachment/perfection and priority, UCC Article 9, bankruptcy/true sale risks, records retention, safeguarding and collections-account controls.
- Securities counsel must classify any fractionalized claim-pool interests or investor return tokens, including issuer/third-party tokenization models, before offers, minting or transfers. Tokenization does not remove securities-law obligations.
- Other possible gates: state lending/servicing licenses and broker permissions, money-transmission and AML/BSA/KYC/OFAC obligations if handling funds, private data protection, taxes, banking and custody partner rules. Classification requires actual transaction facts and counsel; not assumed universally applicable.
- No publishing consumer identities, addresses, case details, balances, hashes derived only from low-entropy personal data, or private legal documents to public Bitcoin/Counterparty networks. Use off-chain encrypted records with access logs and document commitments that do not reveal personal data.

Primary sources:
- CFPB Regulation F: https://www.consumerfinance.gov/rules-policy/debt-collection-practices-regulation-f-compilation/
- CFPB debt collection rule FAQ: https://www.consumerfinance.gov/compliance/compliance-resources/other-applicable-requirements/debt-collection/debt-collection-rule-faqs/
- Texas Finance Code ch. 392: https://tcss.legis.texas.gov/resources/FI/htm/FI.392.htm
- Texas SOS debt-collector bond FAQ: https://www.sos.texas.gov/statdoc/faqs2900.shtml
- SEC Divisions statement on tokenized securities (2026-01-28): https://www.sec.gov/newsroom/speeches-statements/corp-fin-statement-tokenized-securities-012826-statement-tokenized-securities
- SEC/CFTC crypto mining claims warning: https://www.investor.gov/introduction-investing/general-resources/news-alerts/alerts-bulletins/investor-alert-watch-out-fraudulent-digital-asset-and-crypto-trading-websites

## 6. Modular NEO system integration (all proposals)

- **NEO Deal Desk / NIA-013:** seller onboarding, evidence checklist, nonbinding term-sheet drafts, approval routing; no automatic offers or contracts.
- **NEO Nous Economic & Value Kernel:** separate ASSERTED, VERIFIED, PURCHASED, COLLATERAL_ELIGIBLE, FUNDED, SETTLED and REALIZED states. Maintain provenance and double-entry reconciliation only for actual transactions.
- **NEOpass / NeoMask:** reviewer identity and policy signatures if independently production-ready; no live access/signer claims.
- **NEO Bank / NEO Counter / NEO Pay:** prospective bank/custodian payment rails, only upon independent authorization and verified partner connection.
- **Bitcoin / Counterparty:** optional commitment to an encrypted off-chain evidence manifest. A blockchain timestamp is *not* a government lien filing or proof of legal title; no tradable claim token in Gate 1.
- **NEO Core:** restricted Postgres schema, encryption at rest, RBAC, separation of duties, append-only audit log, document retention, recovery/rollback, no secrets in repository.

## 7. Stage-gated record and state machine

`DRAFT -> EVIDENCE_SUBMITTED -> COMPLIANCE_REVIEW -> LEGALLY_VALIDATED -> CREDIT_REVIEW -> CONDITIONAL_APPROVAL -> FUNDING_CONFIRMED -> ESCROW_CLOSED -> SERVICING -> CLOSED`.

Terminal exceptions: `REJECTED`, `DISPUTED`, `TIME_BARRED`, `SUSPENDED`; transitions to purchase/funding blocked when unresolved. A record can be marked eligible only by named approvers and evidence of actual third-party legal rights; the software cannot certify legal enforceability by itself.

Minimum fields: claim ID; instrument/contract type; debt denomination; hashed evidence manifest; seller/owner/servicer identities in restricted database; original/assignment chain; jurisdiction; consumer/commercial class; delinquency/maturity; limitation/dispute/bankruptcy status; assignment and security-interest restrictions; recovery scenarios/source; valuation date; legal reviewer and decision; funding commitment ID, verified amount and expiration; no-onchain-PII commitment; custody/servicer account; incident/rollback state; audit timestamps. See companion JSON schema.

## 8. Gate 2 test plan (sandbox synthetic records only)

1. Reject missing creditor authority, broken assignment chain, unsupported debts, prohibited transfers, time-barred legal action and unresolved disputes.
2. Ensure advance = $0 without a real approved lender commitment; block overadvances, doubled pledge, asset substitution without reassessment, expired diligence, and concentration-limit breaches.
3. Ensure controlled escrow cannot pay seller before proof of actual cleared lender funds and signed closing conditions; concurrent approvals must not double-pay.
4. Simulate loss scenario: 0% recovery, mining loss, BTC drawdown, servicing costs above expectation, lender margin call, lender default, and debtor bankruptcy.
5. Verify that transfer of a registry identifier does not auto-transfer legal ownership; no public debtor PII and no investor-facing trade capability.
6. Preserve event history, privacy deletion policy where lawful, reconciliation of all debits/credits, isolated backups and rollback rehearsal.
7. Require two independent authorized human approvals for any collateral/funding status transition; no production credentials, issuance, trading, escrow or real funds.

## 9. Decision and next gate

**Gate 1 decision: RESEARCH-GO / LIVE-NO-GO.**
- Verified: accessible canonical neo-system repo; existing Nous economic kernel distinguishes claims from external settlements; existing Deal Desk governance requires human approval for investor matters.
- Unknown: any seller claim inventory, rights, lender, licensing, independent appraisal, real custody and escrow provider, contracts, legal opinions, recoveries or mining economics. No claims that these exist.
- No funds moved, seller contacted, securities offered, tokens issued, mining contracts bought, contracts executed or production updated.
- **Gate 2 objective:** produce synthetic claim due-diligence dataset, schema-driven rules engine, borrowing-base and cash waterfall simulator, negative-path tests, and counsel checklist in isolated feature branch. No live investment or collection authorization.
