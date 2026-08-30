# Nibiru Pools — NEO Pool Core v0.1

Nibiru Pool Core is the membership and accounting domain for NEO Bitcoin mining pools.

## Initial operating model

The World Mint Genesis Pool is the intended first operator-controlled pool. Additional member pools can use the same domain model after external miners and production Stratum infrastructure are connected.

## Responsibilities

- register pools and workers
- enforce readiness before activation
- require Bitcoin Core RPC and Stratum connectivity before a pool can become READY
- account for accepted/rejected shares
- produce deterministic audit snapshots
- expose pool data to NEO Miner, NEO Generator, NEO Books, and Discord control-plane adapters

## Architecture

`ASIC / miner -> Stratum gateway -> Nibiru Pool Core -> Bitcoin Core -> Bitcoin network`

Accounting path:

`share -> worker -> member -> pool -> mining production -> NEO Books -> authorized BTC settlement`

Discord is a control/notification plane only. It is not the Stratum transport, Bitcoin node, custody layer, or source of mining truth.

## Financial and governance boundary

This software does not assume that a named institution is legally a bank, central bank, insurer, depository institution, public body, regulated trust, or self-regulatory organization. Those statuses require separate evidence and jurisdiction-specific legal analysis. Pool accounting therefore uses neutral technical concepts: member, pool, worker, balance, allocation, reserve, obligation, and settlement.

Likewise, policy references such as `NEO-SOCIETY-RESOLUTION-002` are internal governance references unless independently established otherwise.

## Activation gates

A pool cannot enter ACTIVE state until:

1. a worker is registered;
2. Bitcoin Core RPC is configured;
3. a Stratum service is configured;
4. the pool reaches READY;
5. the operator activates it.

The first production deployment should use Bitcoin Core on dedicated infrastructure. GitHub and Discord are orchestration/control surfaces, not Bitcoin mining compute.

## Next gate

Implement the Bitcoin Core template adapter and Stratum gateway boundary, then connect share events to persistent NEO Miner production storage. No simulated share or payout value may be presented as actual BTC production.
