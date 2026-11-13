# NEO-TBS-POC-001 — True Bitcoin Standard research-only validation gate

**Status:** Research proof of concept. **Not** regulatory authorisation, benchmark adoption, issuance, settlement, custody, payment or a live financial market service.

## Verified foundations
- `commerce/neo-miner/benchmark-agreement.schema.json`: agreement states, hash, and `government_endorsement: false`.
- `commerce/neo-miner/benchmark-observation.schema.json`: observation data contract, not an attested market feed.
- `server/miner-commerce/benchmarkAgreement.mjs`: synthetic-only, fail-closed reference calculation with schema-compatible agreement output.
- `server/miner-commerce/benchmarkAgreement.test.mjs`: 13 tests of deterministic hashing, missing/malformed/stale inputs, source disagreement and simulated-only output.
- `server/miner-commerce/benchmarkResearchDemo.mjs`: six synthetic BTC/XCP/NOMNI observations, never real prices.

## Run offline
```sh
node --test server/miner-commerce/benchmarkAgreement.test.mjs
node server/miner-commerce/benchmarkResearchDemo.mjs
```

## Research guards and interpretation
1. Proposed demonstration weights are 70% BTC, 15% XCP, 15% NOMNI; not established economic value or regulatory endorsement.
2. Input records must have `simulation: true`, `executable: false`, `status: VALID`, positive numeric prices, a source label and a timestamp. Distinct labels alone **do not prove source independence**.
3. The implementation requires two distinct synthetic source labels for each asset, a common quote currency, timestamps within 15 minutes of the supplied evaluation clock, and no more than 5% spread within each asset. Failed requirements yield `UNAVAILABLE`.
4. Outputs are `SIMULATED`, `executable: false` and `not_for_trading: true`. The result is not a price feed or authorised financial benchmark.
5. JavaScript floating-point arithmetic is unsuitable for financial execution, enforceable payment obligations or production accounting. The input hash supports reproducibility, not evidence of live pricing or backing.
6. No live oracle, independent market verification, customer onboarding, signer, wallet, custody, issuance, redemption or settlement rail is introduced. Do not deploy as a financial product.
7. The existing NOMNI asset and all proposed fiat, reserve or redemption rights must be evaluated separately.

## Legal/perimeter research matrix
| Activity | Evidence | Unresolved question |
| --- | --- | --- |
| Offline benchmark and simulated research | Reproducible source and tests | Whether planned dissemination or use in/from AIFC changes classification |
| Published real-world financial benchmark | No live source attestation or production governance verified | Perimeter, financial promotion, benchmark reliance, data rights |
| NOMNI issuance/backing/redemption | Separate draft circulation registry with live redemption disabled | Token rights, reserve/custody, AML/CFT, stablecoin/monetary treatment |
| Trading, money transfers and custody | Not performed in this gate | Applicable regulated activity, licence type and jurisdiction |
| FinTech Lab regulated pilot | AIFC Client Office provided general guidance, not eligibility | Specific proposed test, operator, 12-month resources, fees, controls |

## Proof requirements for further assessment
- Preserve GitHub commit SHA, Node version, test log and synthetic demo result.
- Reconcile schema fields and document hashes.
- Specify the operator/legal entity, ownership, key personnel, customers, jurisdictions and exact business model.
- Document NOMNI rights, actual backing and redemption promises separately from the research index.
- Obtain qualified AIFC/Kazakhstan legal review and a precise regulator-perimeter clarification **before** live users/assets.
- Seek explicit approval before external submissions, paid services, regulatory applications or new spending.

**Source of regulatory correspondence:** AIFC Client Office response, November 10, 2026; AFSA FinTech Division redirected the original inquiry. This exchange did not confer legal status or regulatory approval. Reconfirm current AFSA rules and any applicable fee notice before preparing an application.

**Next gate:** review draft PR, re-run repository CI, record evidence, then prepare a no-fee *draft* regulator clarification for review. Do not send without explicit approval.
