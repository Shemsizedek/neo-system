# NEO-GENIUS-013 — Controlled Mainline Integration, Financial Logic Hardening & Commercial Signoff

**Checked:** Monday, November 9, 2026 (America/Chicago).  
**Status:** DRAFT INTEGRATION REVIEW — NO MERGE, DEPLOYMENT, TOKEN ISSUANCE, GOVERNMENT BID, INVESTOR FUNDS, PROPERTY OFFER OR LEGAL CERTIFICATION.

## Execution result

The predecessor consolidation draft **#1387** was four commits behind the new `main` and had `mergeable=false` in GitHub. Rather than pretend its previous successful CI made the old branch safely mergeable, this Gate 013 creates an updated integration snapshot based on **main SHA `65344ac56436e1309130270839c88635c7c230f3`**.

- All 34 previously added Gate 002–012 code, evidence and review files were carried into `integration/neo-genius-013-current-main-hardened`.
- Preserved every existing `npm test` glob in the latest main `package.json`, adding only `server/neo-genius/*.test.mjs`.
- Added `server/neo-genius/release-gate-013.test.mjs` for targeted negative cases.
- Prior technical outputs and business source observations remain **operator/public observations, not independent certified financial evidence**.
- Prior PRs are untouched. These changes create a new draft review, not a live production release or merger of another PR.

## Correctness issues found and addressed

### 1. Reserve snapshot duplicate-address risk
The read-only reserve assessor formerly summed all address snapshots without detecting repeated appearances of the same address. A duplicate could inflate the calculated total Bitcoin reserve even if provenance and block height appeared consistent. The assessor now **rejects identical public addresses** within a supplied snapshot batch before aggregation.

**Test:** duplicate rejected; different addresses still aggregate exactly in integer satoshis; `reserveAttested` and `chainIndependentlyValidated` remain false. This does not automatically authenticate ownership of those addresses. Additional source signatures, UTXO reconciliation and independent node work remain required for any real reserve reporting.

### 2. Lock metadata versus lock transaction
The earlier Counterparty issuance parser set `anyLockEventObserved=true` whenever a supplied API issuance row displayed `lock` or `locked`. TokenScan defines the `locked` field as whether an asset is locked, which is not itself a separately authenticated supply-lock TXID. This was a potential **false-event conclusion**.

The new parser retains `anyLockFieldReported` but sets `anyLockEventObserved=false` until a dedicated lock-event verifier, independent Bitcoin tx confirmation, and complete source chronology exist. Legacy tests were updated to require the correct distinction. No physical token lock, issuance or transfer was performed.

Authoritative field description: https://tokenscan.io/api (locked indicates whether future supply issuances are prohibited).

## Dated external acceptance status

| Lane | Finding | Decision |
|---|---|---|
| TEA RFO 701-26-015 | Official/public Nov 13 **2 p.m. CT** written questions deadline and Dec 8 **2 p.m. CT** submission deadline. Euna Procurement registration completion email is the latest verification; completion not established in connected Gmail. | Registration owner must complete authenticated activation and verify portal RFO access. Only portal authorized for written questions/proposal. |
| Carahsoft | Nonbinding teaming inquiry sent; no incoming response found Nov 9 in connected Gmail. | No prime/subcontract relationship; no binding bid. |
| NEO Houses Earlsneuk | Nov 10 **10:00–10:30 a.m. CT** calendar meeting still confirmed and accepted. Builder earlier asserted 7 finished homes + 15 prospective lots; no owner-approved parcel inventory. | Use existing meeting agenda and exact parcel/title intake. No automatic site control/LOI. |
| Dixie / Contempo | No new seller-authorized T12/rent rolls from reviewed broker emails by Nov 9. | Acquisition underwriting HOLD pending documents. |
| NOMNI | CounterPay wallet balances, source-listed metadata, 2017 third-party Bitcoin-address verification TX confirmed by a read-only BTC status service at block 458112. | Genesis and supply lock TXID, full issuance chronology, signatory authority and reserve rights still unverified. |
| STANSHARES / KNOWINDEX | CounterPay earlier reported 1,000 indivisible units each in the registry address; both unlock flags false. | These balances are **not** authenticated corporate shares or fixed issuance totals. Require issuer authority/cap table/counsel. |
| Government reserve demonstration | Existing read-only modules tested only. | No government-owned reserve, TX-RAMP certification, custody status or contract implied. |

## CI/merge-release controls

- [ ] GitHub Actions `npm run build`, `npm test`, architecture and gate inventory pass on **this** branch and SHA.
- [ ] GitHub reports PR mergeable against its latest `main`; recheck before final approval because `main` may advance.
- [ ] Independent code/security review of public market and reserve-input schemas; all external records must be labeled claims and reviewed for confidentiality.
- [ ] Maintainer explicitly approves the draft-to-ready transition and merge. This gate does **not** authorize doing so automatically.
- [ ] Confirm merge-to-main effect on GitHub Actions and any automatic deployment workflow before merge approval. The no-new-cost / no-unapproved-hosting rule remains in force.
- [ ] **Commercial acceptance remains separate from code approval:** verified owner, company, government, securities-law, insurance and procurement authority; no price/market capitalization extrapolation from Counterparty raw token amounts.

## Next actual external action

1. Complete the Euna registration confirmation and examine the 701-26-015 portal's all attachments and question logs before the Nov 13 cutoff.
2. Use the Nov 10 Earlsneuk meeting to request owner-authorized parcel schedule and pricing, not a generic builder promise.
3. Await or obtain written prospective prime agreement; internal code demonstrating synthetic bond data cannot substitute for insurance/TX-RAMP/staffing.
4. Retrieve real Counterparty issuance and lock transaction history through a fully accessible, documented node/provider; the currently used wallet reader does not expose those transaction IDs.
5. Obtain authorized STANSHARES corporate resolution and full capitalization rights; do not issue, unlock or sell securities.

**Follow-on Gate 014 should prioritize accepted third-party evidence and controlled merge authorization, not another software feature without a real blocker.**
