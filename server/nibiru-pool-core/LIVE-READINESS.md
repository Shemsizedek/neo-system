# World Mint Genesis Pool — Live Readiness

This runbook validates the World Mint Genesis Pool before any real miner is treated as live.

## 1. Bitcoin Core preflight

Configure secrets outside GitHub, then run:

```bash
npm run nibiru-pool:preflight
```

The preflight calls `getnetworkinfo`, `getblockchaininfo`, and `getblocktemplate` and requires all of the following:

- Bitcoin Core version is available.
- `networkactive` is true.
- A chain is identified.
- Initial Block Download is complete.
- The block/header gap is no more than two blocks.
- `bestblockhash` is valid.
- `getblocktemplate` returns a valid height, previous block hash, target, and positive coinbase value.

A successful preflight proves the node is suitable to issue mining work at that moment. It does not prove that a miner has connected or that BTC has been mined.

## 2. Start the World Mint service

```bash
npm run nibiru-pool:start
```

Check the private health surface from the same host or protected operator network:

```bash
curl http://127.0.0.1:3334/healthz
curl http://127.0.0.1:3334/readyz
curl http://127.0.0.1:3334/status
```

Do not expose the health endpoint or Bitcoin Core RPC directly to the public Internet.

## 3. Create the first worker

```bash
npm run nibiru-pool:worker -- --worker=world-mint-01 --member=world-mint
```

The CLI prints the generated worker secret once. Store it in the miner configuration or an approved secret manager. Do not post it to Discord or commit it to the repository.

## 4. Safe Stratum connectivity test

Before submitting any mining share, verify protocol connectivity:

```bash
npm run nibiru-pool:smoke -- --host=127.0.0.1 --port=3333 --worker=world-mint-01 --secret='<ephemeral-worker-secret>'
```

The smoke client only verifies:

1. TCP connection
2. `mining.subscribe`
3. `mining.authorize`
4. receipt of `mining.set_difficulty`
5. receipt of `mining.notify`

It intentionally does **not** call `mining.submit`. Therefore a successful smoke test must never be represented as accepted hashpower, a valid share, a block candidate, or BTC production.

## 5. Real miner acceptance gate

Only after preflight and the safe smoke test succeed should a real miner be configured for the Stratum endpoint. The first live acceptance record should capture:

- worker ID
- connection timestamp
- assigned difficulty
- job ID and template height
- first verified share timestamp
- accepted/rejected result
- share hash and target classification

A share is pool work, not BTC. A block candidate is not bookable BTC until Bitcoin Core resolves the block on-chain with at least one confirmation.

## 6. Production accounting invariant

```text
connected worker
  -> mining job
  -> submitted share
  -> server-side reconstruction
  -> share-target validation
  -> network-target validation (only if candidate)
  -> submitblock (candidate only)
  -> Bitcoin chain confirmation
  -> confirmed production event
  -> NEO Generator / NEO Books
```

No simulated test, smoke test, rejected share, accepted pool share, or unconfirmed block candidate may be posted as actual Bitcoin production.
