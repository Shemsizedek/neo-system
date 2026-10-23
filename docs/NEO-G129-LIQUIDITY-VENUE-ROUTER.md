# Gate 129 — NEO Liquidity Venue & Smart Order Router

Gate 129 turns Gate 128 conversion decisions into source-attributed venue routing.

## First-class venues

- Counterparty DEX / Counterparty v2
- NEO Exchange
- NEO FX adapters
- separately authorized external venue adapters

Order-book and RFQ data remain attributed to their venue and observation source. Model or missing data must never be promoted to executable liquidity.

## Best execution

The router considers venue authorization, execution-adapter availability, health/heartbeat age, latency, executable depth, price, RFQs and slippage limits.

## Market integrity

Self-trade prevention is mandatory. Orders owned by the requesting economic actor are excluded from executable liquidity. Wash trading and synthetic liquidity without a source are prohibited.

## Reconciliation

A routed order is not a completed conversion. The venue must return trade/execution evidence and downstream settlement evidence before the router marks the execution reconciled.
