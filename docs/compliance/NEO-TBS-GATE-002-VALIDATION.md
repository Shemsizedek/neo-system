# NEO-TBS-GATE-002 — CI evidence and regulatory boundary review

**Project:** NEO System / Project 144 — True Bitcoin Standard / NOMNI research
**Date:** 2026-11-10
**Status:** Draft PR review evidence; no financial-service activation, entity registration, paid application or AFSA submission.
**Repository:** https://github.com/Shemsizedek/neo-system
**Review:** https://github.com/Shemsizedek/neo-system/pull/1400
**Research branch:** `research/tbs-benchmark-poc-20261110`

## 1. Evidence verified from GitHub

- Initial POC review commit: `72668d9a77d2c4d004fe715e7738d2e244d061fa`.
- GitHub comparison to main: four commits ahead, none behind, four changed files at time of inspection.
- CI workflow run [42872823201](https://github.com/Shemsizedek/neo-system/actions/runs/42872823201), job [130028228777](https://github.com/Shemsizedek/neo-system/actions/runs/42872823201/job/130028228777): **successful**; `npm ci`, `npm run build`, `npm test` completed. Job log states **917 passing tests, 0 failures**. Benchmark tests appear in the log.
- NEO Miner Production CI workflow run [42872823073](https://github.com/Shemsizedek/neo-system/actions/runs/42872823073), job [130028229719](https://github.com/Shemsizedek/neo-system/actions/runs/42872823073/job/130028229719): **successful**; full suite **917 pass / 0 fail**, separate miner-specific test stage **92 pass / 0 fail**, frontend build successful.
- Gate 101 Implementation Autopilot, NEO Services Architecture Standard, Gate 102 Inventory and NEO Discord Primary Control Plane workflow runs also reported success at inspection.
- GitHub review list and inline review-thread list: none submitted.
- PR remains **draft** and unmerged.

**Evidence interpretation:** Successful CI proves this commit passed configured automated workflows, not operational uptime, regulatory classification, independently attested market data, reserve sufficiency, economic validity or authorization. This document commit itself may trigger later CI; re-check the latest branch head and runs before declaring the gate complete.

## 2. Implemented technical controls in POC

| Control | Evidence | Status |
|---|---|---|
| Consistent structured agreement | `benchmarkAgreement.mjs`, agreement schema and unit test | Implemented for research |
| Deterministic agreement hash | SHA-256 over sorted field map | Implemented; not an on-chain attestation |
| Synthetic-only, non-executable observations | Observation validator, tests and offline demo | Implemented for this calculator |
| Input validity, freshness, quote currency and weight sum | Calculator and unit tests | Implemented with test defaults |
| Duplicate ID and source-label checks | Calculator and unit tests | Implemented; labels are **not** proof of independent market provenance |
| Conflicting source prices | Five-percent discrepancy cap in POC | Implemented research rule, not a validated benchmark methodology |
| Reproducible input evidence | SHA-256 `inputs_hash` | Implemented for demo fixture; not an audit of live markets |

### Material limitations and blockers

1. **Economic validity:** BTC/XCP/NOMNI weighting and composite do not have an externally reviewed economic rationale. An arbitrary weighted sum of asset prices is not a defensible unit-of-account methodology without a documented normalization basis.
2. **Real data:** No independent live data provider contracts, source lineage, external attestations, licensing, market surveillance or volume/liquidity controls were verified.
3. **Benchmark publication:** Status `SIMULATED` must not be interpreted as a live, executable or officially recognized rate.
4. **Operational robustness:** Unit tests and CI do not show a monitored deployed service, uptime history, security review or vulnerability assessment.
5. **Financial execution:** JavaScript floating point is inappropriate for financial execution or accounting without a reviewed fixed-precision implementation.
6. **Identity and NOMNI:** This POC does not establish token-holder rights, issuer authority, redeemability, reserve custody, collateral, bank connectivity, trading permissions or AML/KYC readiness.
7. **Schema validation:** Test coverage checks required key alignment; it does **not** implement exhaustive JSON Schema 2020-12 validation against all constraints.
8. **Reviewer signoff:** No reviewer has approved PR #1400; no merge or deploy authorization is inferred.

## 3. Scope boundary

**Allowed for next research gate:** offline synthetic observation runs, static technical explanation, versioned methodology, controlled test fixtures, risk documentation, legal-perimeter questions for internal review.

**Not authorised by this gate:** hosting a public live-rate endpoint; soliciting funds/investments; issuing/redeeming NOMNI or printed bills; custody or settlement on behalf of customers; promises of dollar/gold/BTC convertibility; use of AIFC/AFSA logo as approval; an entity filing or FinTech Lab application; paying a fee; contacting regulator without separate approval.

## 4. Regulatory source map and caveat

Official AFSA Perimeter Guidance: https://orderly.myafsa.com/articles/perimeter-guidance — classification depends on business purpose, activities, location and exemptions or exclusions; financial promotions are separately assessed.

AFSA February 2026 FinTech Lab one-stage process announcement: https://afsa.aifc.kz/afsa-changes-approach-for-assessment-of-potential-fintech-lab-participants/ — published change effective February 16, 2026, with AML/CFT framework still relevant and internal controls required before offering services.

Official AIFC email dated 2026-11-10: registration and financial-service authorisation are distinct; its guidance is **not** an approval, legal opinion or promise of eligibility.

**Research interpretation (not legal advice):** An offline, non-commercial, non-public synthetic POC is the narrowest initial activity to examine without an AIFC registration or paid application. Publication, commercial benchmark licensing, investment promotion, actual token operations and services conducted in/from the AIFC require separate local legal and regulatory assessment. An AIFC licence does not grant authority everywhere.

## 5. Gate decision and next verification steps

- [x] Verify current GitHub branch, review status and CI results.
- [x] Inventory implemented controls and important unproven claims.
- [x] Prepare a regulator-perimeter question draft for internal review in `docs/compliance/NEO-TBS-AFSA-PERIMETER-QUESTIONS-DRAFT.md`.
- [ ] Get technical reviewer signoff for methodology, security and data source assumptions.
- [ ] Confirm who legally operates/owns the research and which future activities, countries, client types and NOMNI rights are proposed.
- [ ] Recheck CI after documentation commits, then decide whether to merge **research-only** POC.
- [ ] Obtain explicit approval before approaching AFSA, signing agreements, submitting applications, incorporating an entity, spending or deploying anything resembling a financial service.

**Recommended gate:** maintain PR in draft pending technical and legal review; keep research prototype separate from NEO Pay, NEO Bank, trading, custody, token issuance and redemption.
