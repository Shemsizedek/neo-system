# Project 144 — Standard Benchmark Agreement, NOMNI, CES V-Dollar and onchain evidence review

Audit date: 2026-10-29. Status: **READ-ONLY, SINGLE-NODE PROTOCOL RECONCILIATION**.
This document is a sourced historical and technical review, not a legal opinion, reserve audit, state approval, or recognition of a central bank.

## Historical agreement sources and evidence tiers

1. **Issuer-authored 2017 proposal, reproduced in later publications** — The Shelton Estate "NEO Index" publication (dated 2022-04-14) describes a memorandum dated 2017-01-30, an 800 million share pre-mined offering concept, the unit of account **Nomni**, CES mutual-credit exchange, and conversion ambitions with BTC, XCP, mutual credit and precious metals.
   - https://sheltonestate.family.blog/portfolio/neo-index/
   - Classification: source documents assert these terms; signatories, legal enforceability, dated execution and performance of obligations have **not** been independently verified.
2. **Resolution Bill** — The 22-page document marked "STANDARD BENCHMARK AGREEMENT ACT", dated 2019-10-27, includes Section 71 dated memorandum language and Section 72 geographic basket benchmark model.
   - https://www.community-exchange.org/exchanges/nmni/Standard%20Benchmark%20Agreement%20Resolution%20Bill.pdf
   - Classification: internally published document. Its use of "World Government", "World Treasury", "central bank", "lawful money", sovereign powers and global parties does not establish recognition under U.S. or other national law; obtain separately verifiable signatory and governmental authorization.
   - The resolution's references to 900 million **callable bank shares** or other nominal appropriations are **not** a substitute for bank assets, cash or verified asset issuance.
3. **Family-office homepage** — https://office.holytemples.org/ (public website accessible as of audit); describes Shelton Estate & Co and links to the NEO Index ecosystem. A website is not an audit opinion, bank charter or proof of reserve deposits.
4. **Counterparty protocol facts** — official public API: https://api.counterparty.io:4000/v2/ , https://api.counterparty.io:4000/v2/assets/NOMNI , and relevant child routes. These are queried **read-only**, not written to.

## Counterparty read-only facts (same public node, sampled 2026-10-29)

- API: v11.5.0, mainnet, server_ready=true, ledger_state=Following, counterparty_height=backend_height=973747.
- Asset: **NOMNI**, asset_id **6195210**, non-divisible, **locked**, declared supply **900,000,000**, current owner **18FyntJG9hdXYvanm67mGgbyo1P7adckvg**; original issuer **1NySA74g62Mr28Unp4uCxwtQv9FkD7AVpk**.
- First issuance: block **421,813**, transaction **83c5e316c4ecce8bab8c5ec966da754da32548105c6fd6eb5349659d06c70925**, **900,000,000** units, description "Base Currency of the N.E.O.".
- Subsequent valid issuance-family events at blocks 458163, 543489, 917884, 972822: description/lock/owner events with **zero** additional quantity. Total count 5 valid records, 1 positive issuance. No destruction records returned.
- Current complete holder endpoint: **915 rows** and no pagination cursor; **906 balance-type entries = 894,011,631 NOMNI**; **9 open-dispenser escrow entries = 5,988,369 NOMNI**. Total **900,000,000 NOMNI**; the address-balance endpoint separately returned 837 rows, so do NOT infer unbacked or missing units by comparing just 837 address balances to supply. Dispenser escrow explains the apparent 5,988,369-unit gap.
- These numbers are reconciled against **one** public Counterparty API instance reporting synchronized state, at a named block. A separately operated **second synchronized node** and onchain block-hash cross-check remain outstanding; no independent signature, full balance holder ownership proof, or reserve attestation was obtained.
- Historic statement of "800 million shares" appears to refer to a proposal or allotment and **does not equal** the documented onchain creation. The onchain issuance itself was 900 million; no separate late 100 million issuance was observed. Legal reason for the earlier 800 million statement is unresolved.

API paths for reproduction:
  - GET /v2/
  - GET /v2/blocks/last
  - GET /v2/assets/NOMNI
  - GET /v2/assets/NOMNI/issuances?limit=1000
  - GET /v2/assets/NOMNI/holders?limit=1000
  - GET /v2/assets/NOMNI/balances?limit=1000
  - GET /v2/assets/NOMNI/destructions?limit=1000

The library counterparty-supply-audit.mjs performs deterministic offline assertions on independently collected full response JSON; it issues no requests and cannot move funds.

## CES / NMNI / V-Dollar: separate ledger obligations

- NEO's repository registers CES exchange **NMNI**, named **World Open Market Exchange**, with "Nomni" as its CES unit and **Mutual Credit** as exchange type; this is a distinct ledger from the Bitcoin Counterparty asset **NOMNI**. Source: src/ces/registry.ts.
- The Community Exchange System's own materials say a mutual-credit balance is a record of community trade debits/credits, **not automatically cash, a bank deposit or a redeemable dollar**: https://www.community-exchange.org/home/what-is-the-ces/ .
- V-Dollar issuance is **separately gated** in NEO source: server/neo-identity/banking-authority.mjs requires authenticated founder principal + explicit vdollarIssuanceAuthorized + step-up verification; server/neo-bots/ces-interface-policy.mjs marks "ces.vdollars.issue" legacy-only value movement. Source existence does not prove any V-Dollar actually issued, funded, transferable or legally redeemable.
- Keep three distinct accounting buckets: (a) immutable Counterparty NOMNI token supply/escrow, (b) CES/NMNI mutual credit and V-Dollar memoranda/positions, (c) **independently held and attested** permissible real fiat reserves / associated legal liabilities. Do not double count V-Dollar or internal credit as dollar reserve backing for NOMNI.
- Any requested conversion from NOMNI to BTC, XCP, metals or CES credit is a **separate bilateral market/custody and legally enforceable redemption feature**. Neither agreements nor product descriptions prove executable liquidity or current 1:1 USD cash convertibility.

## Bitcoin fee and tax/levy claim boundary

- BTC onchain transaction fees are network transaction fees paid to Bitcoin block miners, not automatically a tax or a payment into NEO's treasury.
- CES may impose a separately specified exchange levy or community assessment according to CES contracts, disclosures, actual collection and applicable law. Distinguish a voluntary contractual levy from sovereign tax power; do not label network fees as a legally imposed tax absent authorization.

## Benchmark versus payment-stablecoin model

The original basket / land-patent / precious-metal benchmark concept may be recorded as historical methodology and used as an **unfunded research index** with well-sourced quotations. It must not silently substitute for the newly selected U.S. dollar stablecoin objective. The USD 1:1 program requires independently verified **eligible USD reserve assets**, legally enforceable redemption, lawful issuer authorization and current holder rights. A BTC/XCP/metal portfolio may be quoted as separate market value, but it does not itself prove a qualifying dollar reserve for a payment stablecoin under applicable issuer rules.

A claim that NOMNI was historically the "first stablecoin" is a proposal's self-description, not an independently proven market-history priority or regulator recognition.

## Institutional and regulatory gate

As of 2026-10-29, the OCC GENIUS Act site states it **is not accepting issuer applications/waivers pending final OMB authorization**. The October 21, 2026 final rule becomes effective January 18, 2027; the statutory issuer-approval and consumer protection process depends on the legal entity and activity.
  - https://www.occ.gov/news-issuances/bulletins/2026/bulletin-2026-50.html
  - https://www.occ.gov/news-issuances/bulletins/2026/bulletin-2026-51.html
  - https://occ.gov/topics/charters-and-licensing/genius-act/index-genius-act.html

## Independent audit and legal evidence remains missing

1. Second independently operated synchronized Counterparty mainnet node at a reconciled height, including block header verification and replay/pagination checks.
2. Execution copies, signer authority and legally recognized status of 2017 MOU and later resolution; actual entity owning NOMNI liabilities and authority to contract with current holders.
3. CES source account statements for NMNI and V-Dollar, legal issuer terms, and distinct reconciliation to NEO internal account records; no automated issuance.
4. Custodian confirmations, **eligible** reserve balance, beneficial ownership / encumbrance review, independent attestation and compliance counsel.
5. Holder-by-holder redemption eligibility, terms, conversion rates, expenses, handling of locked supply, and treasury exposures.
6. Written legal determination of any proposed current stablecoin regulatory treatment and public disclosure policy.

Do not merge issuer status, money movement or reserve estimates into NOMNI token metadata. Existing public metadata remains unchanged, and Coinbase retains Bitcoin-only provider isolation under PR #1266.
