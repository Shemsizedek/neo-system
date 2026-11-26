# NEO-GENIUS-012 — Mainline Integration & Evidence-Closure Decision
**Reviewed:** 2026-11-08 (Houston / America-Chicago)  
**State:** DRAFT GitHub PR #1387, NOT MERGED, DEPLOYED, GOVERNMENT-SUBMITTED OR COMMERCIAL-APPROVED.

## Actual execution
- Created `integration/neo-genius-012-current-main-review` from current `main` commit `f648783c6ce471d7afecd272e05c994df08815ae`.
- Integrated the dated compliance, government procurement, housing and issuer-review documentation plus all available read-only NEO-GENIUS modules and tests from draft Gates 002 through 011. Preserved current main's complete test script and added `server/neo-genius/*.test.mjs`.
- GitHub comparison immediately after integration: the branch contains new files, one limited `package.json` test-script change, and was **zero commits behind** main at that point; verify again before release.
- Sanitized the public STANSHARES issuer intake: removed an unverified same-name third-party court filing and instead requires confidential official corporate identity matching before any legal conclusion.
- Existing stacked drafts remain open. No branch was merged into `main`, no deployment was triggered intentionally by this gate, and no wallet/securities/property or procurement transaction was executed.

## Acceptance boundaries
1. **Source metadata**: CounterPay/Horizon NOMNI balances, lock flag and owner fields are reported API observations, not reproduced node attestation or lawful title.
2. **Historical Bitcoin verification**: 2017 NOMNI-related CoinDaddy-address verification TX `02b553692692fc4db8400f0433a8599969ea6340b92e60b72e83647abd17b7f7` has a connected Bitcoin status reader response **confirmed at block 458112**. It is **not the original NOMNI genesis/lock issuance TX** and does not prove current key control, reserves, redemption or a legal security.
3. **STANSHARES / KNOWINDEX**: 1,000 units each in an observed public Orange Chip address and unlocked supply flags; cannot be represented as authorized stock or an offering until signed issuer resolutions/cap table, valid chain issuance proof and counsel approval.
4. **NEO Houses**: builder's Nov 10 meeting and reported 7 completed / 15 prospective homesites; no legal title, owner-approved inventory or site control documented. Existing multifamily seller financials not authenticated.
5. **TEA RFO 701-26-015**: vendor Euna account still needs human activation per last Gmail notice; Carahsoft nonbinding inquiry without reply; no award or contract. Written questions due **Nov 13 2026 2 p.m. CT** and response due **Dec 8 2026 2 p.m. CT**, through the authorized procurement portal.

## Protected release checklist
- [ ] New `main`-based integration CI and architecture tests pass.
- [ ] Full source/license/security review of reserve/counterparty modules, no untrusted API financial certification.
- [ ] GitHub reviewers approve the consolidated PR, and check any changes in `main` since branch creation.
- [ ] Explicit approval to merge for source-review purposes; do not auto-deploy services or launch market functions.
- [ ] Legal/property/insurance/procurement certifications remain separate and incomplete even after successful merge.

**Gate 013 should use the clean PR as its baseline. Next: resolve any CI errors without duplicating code; close superseded drafts only after owner approval; obtain independent NOMNI issuance TXID and actual partner/owner authorization before commercial release.**
