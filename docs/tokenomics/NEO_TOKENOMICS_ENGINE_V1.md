# NEO Tokenomics Engine v1

Status: Architecture specification

## 1. Economic layers

NEO Tokenomics separates productive capacity, settlement assets, market/index units, credit, labor, and accounting.

- Bitcoin (BTC): reserve and settlement asset; mining output.
- Counterparty / XCP: Bitcoin-native protocol and asset layer.
- NOMNI: NEO market/index layer for W.O.M.E. (World Open Market Exchange).
- World Currency (∞): community liquidity, pricing, mutual-credit and labor accounting unit.
- Orange Chip™ instruments: independently defined listed instruments with wallet-verifiable entitlement rules.
- NEO Books: double-entry accounting and audit layer.

No external blockchain is required by this architecture. Counterparty protocol logic is still required to interpret Counterparty transactions embedded in Bitcoin transactions.

## 2. World Currency benchmarks

Initial declared benchmarks:

- 10 minutes = ∞1
- standardized labor hour = ∞33
- 1 troy ounce gold = ∞1
- 1 troy ounce silver = ∞50

IMPORTANT: ∞1 per 10 minutes mathematically equals ∞6 per clock hour. Therefore ∞33 is treated in v1 as a separate standardized labor-hour benchmark rather than a linear time conversion. This prevents contradictory accounting.

## 3. Mining products

### Mining Contract
A contractual allocation of mining capacity for a defined duration and hashrate.

Required fields:
- contract_id
- purchaser_wallet
- payment_asset (BTC, XCP, NOMNI, WORLD_CURRENCY)
- purchase_amount
- hashrate_th_s
- start_time
- end_time
- pool_reference
- operating_cost_rate
- service_fee_rate
- orange_chip_tier
- payout_wallet
- status

### Hashpower Unit
Canonical quote unit:

`∞ / TH/s-day`

Larger commercial quotes may use `∞ / PH/s-day`.

## 4. Dynamic hashrate pricing

Hashpower must not use a permanently hard-coded ∞ price. The quote engine should consume observable mining economics and configuration values.

Conceptual formula:

`HASH_QUOTE_∞ = expected_operating_cost_∞ + infrastructure_cost_∞ + service_fee_∞ + risk_reserve_∞`

Contract quote:

`CONTRACT_∞ = HASH_QUOTE_∞ × contracted_hashrate × duration`

Production implementation must expose each component and timestamp the quote so historical invoices remain reproducible.

## 5. Orange Chip™ entitlement gate

Wallet verification determines benefits, not basic market access.

Standard wallet:
- standard contract rate
- standard hashpower allocation
- standard service fees

Eligible Orange Chip™ wallet:
- instrument-specific preferred pricing where authorized
- priority capacity where authorized
- instrument-specific fee treatment
- BTC distribution eligibility only where the governing instrument expressly grants it

Never infer entitlement merely from an asset name. The eligible asset registry is authoritative.

Pseudo-flow:

1. Receive purchaser wallet.
2. Query Bitcoin/Counterparty balances.
3. Compare holdings against `orange_chip_registry`.
4. Resolve tier and governing instrument.
5. Apply only registered benefits.
6. Persist the verification block/time and entitlement decision in NEO Books.

## 6. BTC mining distribution waterfall

Mined BTC is accounted for before distribution.

`GROSS_MINED_BTC`

minus pool/mining fees
minus operating obligations
minus contractually defined reserves
minus contractually defined service/management amounts

= `NET_DISTRIBUTABLE_BTC`

Only the resulting distributable amount may enter a holder/contract distribution calculation.

Every payout record requires:
- source mining period
- gross BTC
- deductions by category
- net distributable BTC
- governing contract/instrument
- eligible units/holdings
- payout amount
- destination wallet
- Bitcoin txid after broadcast

Projected BTC is never booked as mined BTC.

## 7. NOMNI / W.O.M.E.

NOMNI is modeled as a NEO market/index layer rather than literally as DXY.

Candidate index basket:
- BTC
- XCP
- gold benchmark
- silver benchmark
- standardized labor benchmark
- World Currency market activity
- approved Orange Chip™ market data

The production index requires explicit weights, data-source rules, rebalance rules, stale-price handling and a version number before it can publish an authoritative index value.

`NOMNI_INDEX(v) = Σ(weight_i × normalized_component_i)`

No weight may change retroactively.

## 8. NEO Books chart of accounts

Minimum ledger classes:

### Assets
- BTC Treasury
- BTC Mining Receivable
- XCP
- Counterparty Assets
- Operating Cash / Settlement Assets

### Liabilities
- World Currency Mutual Credit Payable
- Mining Contract Obligations
- BTC Distribution Payable
- Customer Balances

### Equity / Net Assets
- Treasury Capital
- Retained Mining Surplus

### Revenue
- Mining Contract Revenue
- Hashpower Revenue
- Service Revenue

### Expenses
- Mining Pool Fees
- Energy / Hosting
- Infrastructure
- Network Fees
- Operations

### Memorandum / subledgers
- Tokenized Labor
- Mutual Credit Limits
- Orange Chip™ Eligibility
- Hashpower Allocations

## 9. Double-entry controls

The engine must never equate unlike claims:

- projected mining output != BTC
- mutual credit != BTC reserve
- NOMNI balance != BTC reserve
- labor obligation != cash
- Orange Chip™ holding != automatic BTC entitlement

Each transaction posts balanced debits/credits plus references to the relevant Bitcoin transaction, Counterparty event, contract, invoice, labor record or mutual-credit authorization.

## 10. Core APIs

Recommended service boundaries:

- `POST /tokenomics/quote/hashpower`
- `POST /tokenomics/quote/mining-contract`
- `GET /tokenomics/orange-chip/:address`
- `POST /tokenomics/contracts`
- `GET /tokenomics/contracts/:id`
- `POST /tokenomics/mining/production`
- `POST /tokenomics/distributions/calculate`
- `POST /tokenomics/distributions/broadcast`
- `GET /tokenomics/nomni/index`
- `POST /books/journal`
- `GET /books/audit/:reference`

Signing/broadcast operations must remain separated from quote/accounting logic and require explicit authorization controls.

## 11. State machine

Mining contract:

`QUOTED -> FUNDED -> VERIFIED -> ACTIVE -> MATURED -> SETTLED`

Exception states:

`REJECTED | EXPIRED | SUSPENDED | CANCELLED | DISPUTED`

BTC distribution:

`CALCULATED -> REVIEWED -> AUTHORIZED -> BROADCAST -> CONFIRMED -> POSTED`

## 12. Compliance boundary

The software records economic rights exactly as defined by governing documents. It does not self-declare whether an Orange Chip™, mining contract, token, mutual-credit claim, or distribution is a security, deposit, currency, commodity, dividend, interest payment, or other regulated product. Those classifications must be configured from the applicable legal/compliance determination.

## 13. Economic flywheels

Capital -> Mining Capacity -> Hashpower -> BTC Production -> Contractual Distribution / Treasury -> Market Activity -> Capital

Labor -> World Currency -> Mutual Credit -> Commerce -> NEO Books -> W.O.M.E. market data

Settlement bridge:

BTC <-> XCP / Counterparty assets <-> NOMNI <-> World Currency

## 14. Next implementation gate

Build `packages/tokenomics-core` with deterministic quote functions, Orange Chip registry schema, mining-contract state machine, distribution waterfall and NEO Books journal adapters. All monetary arithmetic must use integer smallest units or arbitrary-precision decimal arithmetic; floating-point arithmetic is prohibited for balances and settlement.