# Nibiru Pools — NEO Pool Core v0.2

Nibiru Pool Core is the membership, mining-job, share-verification, and accounting domain for NEO Bitcoin mining pools.

## World Mint Genesis Pool

The World Mint Genesis Pool is the first operator-controlled pool profile. Additional member pools can use the same pool and worker model as mining capacity is added.

The Genesis runtime now supports the following internal path:

`Bitcoin Core getblocktemplate -> coinbase construction -> merkle branch -> mining.notify -> worker solution -> header verification -> network-target candidate -> submitblock`

## Responsibilities

- register pools and workers
- enforce readiness before activation
- require Bitcoin Core RPC and Stratum connectivity before a pool can become READY
- preserve raw Bitcoin Core template transactions needed to serialize solved blocks
- construct BIP34 coinbase transactions and optional default witness-commitment output
- split coinbase data around extranonce2 for Stratum jobs
- derive and verify the coinbase merkle branch
- assign and adjust share difficulty
- reconstruct and double-SHA256 an 80-byte Bitcoin block header
- distinguish a pool share from a Bitcoin network-target block candidate
- serialize a candidate block and call Bitcoin Core `submitblock`
- keep accepted-block submission non-bookable until independent on-chain confirmation
- persist share/audit data through the NEO Miner storage boundary
- expose pool data to NEO Miner, NEO Generator, NEO Books, and Discord control-plane adapters

## Architecture

`ASIC / miner -> Stratum gateway -> Nibiru Pool Core -> Bitcoin Core -> Bitcoin network`

Accounting path:

`share -> worker -> member -> pool -> mining production -> confirmed block -> NEO Books -> authorized BTC settlement`

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

A submitted share cannot create BTC production merely because it is accepted by the pool. BTC becomes bookable only after a valid network-target block is accepted by Bitcoin Core and independently confirmed on chain.

## Current implementation boundary

The repository now contains Bitcoin transaction/block construction primitives and a World Mint Genesis runtime, but it is not yet a production public pool. Before public ASIC onboarding, the Stratum V1 wire behavior must be conformance-tested against real mining clients/firmware, rate limits and DoS controls must be added, Bitcoin Core must run on dedicated infrastructure, block-confirmation monitoring must be connected, and TLS/proxy/network deployment must be hardened.

## Next gate

Connect the Genesis runtime to the existing TCP gateway and persistent pool store, add template refresh/long-poll supervision, stale-job rejection, block-confirmation monitoring, and NEO Books production-settlement events. No simulated share, block, or payout value may be presented as actual BTC production.
