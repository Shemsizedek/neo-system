# NEO-TBS-GATE-003 — Methodology correction and merge-readiness review

**Status:** Research branch only. No independent reviewer signoff, merger, deploy, AIFC application, fee, NOMNI issuance, trading, money transmission, custody or live data ingestion.

**Scope:** Compare True Bitcoin Standard POC implementation with its own evidence and requirements. The proposed True Bitcoin Standard is not a sovereign standard, an authorised benchmark, or a guaranteed NOMNI redemption rate.

## What changed in the technical review

The prior calculator formed an arithmetic sum of BTC, XCP, and NOMNI *prices* weighted at 70%, 15%, and 15%. That is not a defensible composite, because a BTC/USD price and an XCP/USD or NOMNI/USD price are expressed in unequal asset units. A large BTC price would dominate the number independent of the stated weights.

**Corrective change:** Require an explicit synthetic reference price for each asset; divide each synthetic observed asset price by its own synthetic reference; then sum those dimensionless ratios using weights and scale by 100.

```
ratio[asset] = median_synthetic_price[asset] / synthetic_reference_price[asset]
synthetic_index_points = 100 * sum(weight[asset] * ratio[asset])
```

This yields **INDEX_POINTS**, not USD, BTC, NOMNI, an exchange rate, a redemption promise or a market price. Reference data must be tagged `simulation: true`, have an ID and timestamp, contain a common quote-currency label, and positive numeric synthetic base prices for all components. Results remain explicitly non-executable.

The reference price values and 70/15/15 weights are demonstration parameters; they have **no independent economic, financial, reserve or regulatory validity**. A dimensionless normalization fixes a mathematical unit problem, but it does **not** validate the benchmark's economic meaning.

## Evidence and checks

- Branch: `research/tbs-benchmark-poc-20261110`; draft PR: https://github.com/Shemsizedek/neo-system/pull/1400
- `benchmarkAgreement.mjs`: reference validation, common quote requirement, positive time windows, synthetic base-100 index, reproducibility hash incorporating input observations, weights, reference and rules.
- `benchmarkAgreement.test.mjs`: includes fail-closed cases for absent and improper references, normalized index arithmetic, reproducible reference/weights/rules hashing, and invalid time windows.
- `benchmarkResearchDemo.mjs`: explicitly declared synthetic base values and synthetic observations.
- GitHub CI is authoritative for committed branch test results; log run IDs and exact commits separately after the latest code changes. **An earlier green run does not prove these new edits passed.**

## Remaining POC weaknesses

1. **Independence is asserted, not proven.** Two distinct source labels are not two independent, trusted, exchange-sourced price observations. No live feed is introduced.
2. **Weights and references are arbitrary.** Economic rationale, reference-date selection, basket rebalancing, survivorship rules, data governance and market selection require professional review.
3. **No full schema validator.** Unit tests cover required field alignment but not the entire JSON Schema 2020-12 validation specification.
4. **Source timestamps are synthetic.** No external verification, trusted time authority, market hours, source licensing or attestation is implemented.
5. **Hash is not legal audit attestation.** A stable SHA-256 digest does not independently attest market facts or sign the inputs.
6. **Numerical representation is floating point.** The calculator must never be used for customer money, obligations, financial settlement, account balances or real pricing.
7. **Regulatory boundary is open.** Activity-by-activity scope, actual NOMNI rights, issuing/operating entity, user location and financial promotion perimeter need AIFC/Kazakhstan legal review.
8. **Branch divergence:** As checked 2026-11-15, PR branch was 48 commits behind updated `main`; rebase/reconcile and rerun CI before a merge-readiness decision.
9. **Not independently reviewed.** GitHub CI passing is not a signoff by a financial benchmark expert, auditor, counsel, or regulator.

## Acceptance gates

- [ ] Current branch CI passes benchmark tests, repository tests and frontend build.
- [ ] Current branch is reconciled with `main` using a separate, reviewed integration step, then re-tested.
- [ ] Independent technical reviewer confirms API behavior and threat model.
- [ ] Benchmark-methodology reviewer accepts economic assumptions or maintains research-only classification with explicitly arbitrary simulation values.
- [ ] Operator and legal entity are identified for any future real-world activity.
- [ ] AFSA activity classification is assessed before any live operation in or from AIFC.
- [ ] Merge authorised separately; never infer permission to deploy, launch real markets, contact AFSA, register or incur fees.

**Decision:** Keep draft PR #1400 research-only. Technical corrections address misleading units but do not qualify for a live benchmark, financial product or regulatory application.
