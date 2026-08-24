# NEO Bitcoin Generator v0.22 — Core Optimization & Hashpower Engine

This layer focuses the Generator back on mining operations.

## Responsibilities

- score miners by efficiency, uptime, temperature, rejected-share rate, and power cost
- preserve configurable reserve capacity
- allocate higher-priority contracts first
- recommend PERFORMANCE / BALANCED / EFFICIENCY / LOW_POWER / STANDBY modes
- select eligible pools using fee, latency, and accepted-share criteria
- expose deterministic allocation decisions for audit and settlement attribution

## Safety boundary

Optimization may recommend operating modes and pool routes, but hard electrical and thermal safety limits remain locally authoritative in the NEO Miner Controller. Cloud optimization must never override local emergency shutdown logic.

## Data quality

Live profitability and revenue decisions require verified network difficulty, pool payout, BTC price, electricity rate, and miner telemetry. Missing live inputs must not be replaced with fabricated production values.
