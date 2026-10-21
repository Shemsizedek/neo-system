# CROWN-GEM-065 — Canonical Bitcoin-anchored market intelligence (NEO Nous OS → NEO Crown Chain → NEO Scan)

## Correction of the earlier design assumption
NEO Crown Chain must not be assigned an independent genesis block. Its L3 records reference existing **Bitcoin block/transaction anchors** and **Counterparty L2 asset issuance and transactions**. An L3 market intelligence observation, valuation, or calculation is a distinct typed record with verifiable provenance; it is **not** itself a Bitcoin consensus transaction or proof of title. Publishing an L3 digest to Bitcoin is a separate transaction requiring an explicitly authorized signer and network confirmation.

## Canonical division
1. **Bitcoin — settlement/anchoring:** block height, block hash, transaction ID, finality/confirmation observation.
2. **Counterparty — asset protocol:** Bitcoin-native asset name, issuer, issuance/transfer events, protocol-defined validity.
3. **NEO Crown L3 — market intelligence:** independently sourced economic measurements, bond schedules and credit observations, housing cashflows/indices, share capitalization, index constituent rules and fund valuations. Link back to L1/L2 evidence.
4. **NEO Scan — consumer UI:** consistent asset overview, labeled measurements, as-of date, units, change/benchmark comparisons, provenance, issuer and risk/uncertainty states.

`src/explorer/crownMarketSchema.ts` supplies the typed envelope and UI summary mapping.

## Verification and comparison policy
- Use unique IDs and explicit units/currencies, observation dates, methodology IDs, source records, and evidence states for each metric.
- Different instruments cannot be directly compared unless the measure, units, timestamps, adjustments, and methodologies are compatible.
- Distinguish issued units, ownership proof, market quotations, modeled values, claimed collateral, and audited/verified financial statements.
- All calculations must be reproducible from referenced inputs; stale/missing market information is shown as unavailable, never invented.
- An asset's metadata must not be interpreted as an enforceable bond, registered security, verified property title, credit rating, or actual yield without relevant independent legal and economic evidence.
- Corrections are successor observations; do not overwrite historical anchored records.

## UI modules (retail-first)
**Overview** shows asset identity, category, Bitcoin anchor, Counterparty issuance, price/measurement status and evidence date.
**Performance** charts time series by measured unit and observation timestamp; reports calculation method and benchmark.
**Terms** displays class-specific details (coupon/maturity for bonds, NOI/occupancy/cap rate for housing, shares/votes for equities, constituent methodology for indexes).
**Compare** uses comparable units, date windows, and methods, warning on incompatible instruments.
**Verify** discloses source URLs, independent evidence status, and cryptographic commitments without exposing treasury/private signer details.

## Uncompleted engineering tasks
- Identify and map original NEO Crown Chain data and historical Bitcoin block anchor representation; no new genesis.
- Build concrete adapters to authenticated Counterparty and independent Bitcoin block proof sources.
- Persist observations and checkpoint receipts append-only with independent witnesses.
- Connect real API data to NEO Scan UI; current TypeScript module is a schema/presentation adapter, not a deployed website update.
- Regression tests, multi-client quota certification, durable audit storage, and network egress enforcement.

Production remains NO-GO.
