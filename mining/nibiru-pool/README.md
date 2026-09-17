# Nibiru Pool Core

NEO System Bitcoin mining control-plane module.

## Gate 4: Runtime validation

This gate verifies the Codespace/Linux runtime before a Stratum service is connected.

Run from the repository root:

```bash
chmod +x mining/nibiru-pool/validate-stack.sh
./mining/nibiru-pool/validate-stack.sh
```

The critical success marker is:

```text
STATUS: BITCOIN_TEMPLATE_READY
```

That means Bitcoin Core RPC can supply a candidate block template to a mining/pool service. It does **not** mean profitable Bitcoin hashing is occurring.

## Architecture

```text
Bitcoin Core RPC
      |
      +-- getblocktemplate
      |
Nibiru Pool Core
      |
      +-- Stratum service (next gate)
      +-- worker authentication
      +-- share validation/accounting
      +-- payout accounting
      |
      +-- Counterparty integration
      +-- CES/community accounting integration
```

## Security baseline

- Never commit Bitcoin RPC passwords, wallet seeds, private keys, API secrets, or miner credentials.
- Bind Bitcoin RPC to localhost/private networking unless an authenticated proxy is deliberately deployed.
- Mining workers must never receive wallet private keys.
- Production payout/signing remains user-controlled and separate from pool job distribution.
- Validate on a non-production network before enabling mainnet payout automation.

## Next gate

After `BITCOIN_TEMPLATE_READY`, implement the Stratum-facing adapter and a local test worker, then validate submitted shares before connecting external SHA-256 ASIC hardware.
