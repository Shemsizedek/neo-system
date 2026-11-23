# Project 144 — NVM/BVM Bitcoin-only gate
NVM is a restricted compiler for native Bitcoin Script and BVM is an isolated **Bitcoin Core regtest** verification adapter. This is not a general-purpose virtual machine, a change to Bitcoin consensus, an EVM implementation, or a live contract/payment service.

## Existing NEO infrastructure
- Reuse `server/miner-production/bitcoinWallet.mjs` for operator-configured Bitcoin Core RPC.
- Reuse `server/nibiru-pool-core/regtestGate.mjs` for read-only regtest readiness (generate=0).
- NEO's `deploy/world-mint/install-host.sh` installs the World Mint Linux **service**, not the Bitcoin Core binary. Bitcoin Core must be installed separately and verified.
- A standalone Bitcoin Core binary and a disposable regtest wallet are required for full integration tests.

## Security / limitations
- Regtest **only**: reject mainnet, testnet, signet, Ethereum or unknown networks.
- No signing, broadcasting, wallet private keys, spending, VM remote execution, EVM bytecode, Ethereum bridges or token approvals.
- P2WSH hashlock alone does **not** authorize a specific person: anyone possessing its preimage can spend. Never use it to secure real value.
- `testmempoolaccept` is a mempool-policy test, not a proof of final settlement or final consensus validation.
- Never make Bitcoin Core RPC publicly accessible. Use loopback and external secret management, not GitHub secrets in source files.

## CI and local verification
```bash
node --test server/neo-vm/*.test.mjs
```
These are mocked RPC/unit tests, **not** live Bitcoin Core validation.

## Actual Bitcoin Core acceptance
1. Verify the operator-owned Bitcoin Core installer / binary source, version, binary signature or reproducible hash, OS and service settings.
2. Start `bitcoind -regtest` in a **separate** data directory on a controlled host, RPC on loopback.
3. Confirm `getblockchaininfo.chain` equals `regtest` before providing any fixture.
4. Build a disposable regtest-only funding transaction paying the exact P2WSH output, mine its confirmation, construct a valid witness spending it and check `testmempoolaccept`.
5. Repeat with a mismatched preimage, wrong outpoint, oversize witness and invalid fee; validate mempool policy rejects each as applicable.
6. Independently review witness/prevout binding, fee limits, reorg behavior, rollback and wallet/signer separation before considering public deployment.
7. No mainnet activation or NEO Pay/NEO Bank/CES integration until independent review and explicit readiness signoff.

## Example isolated RPC test invocation
```bash
BITCOIN_RPC_URL=http://127.0.0.1:18443 BITCOIN_RPC_AUTH='regtestuser:regtestpassword' \
 node server/neo-vm/regtest-cli.mjs /path/to/disposable-regtest-fixture.json
```
Fixture JSON: `{"program":{"version":1,"network":"bitcoin-regtest","contract":{"kind":"sha256-preimage","digest":"<64 hex>"}},"outpoint":{"txid":"<64 hex>","vout":0},"rawTransactionHex":"<signed spend tx hex>"}`.
