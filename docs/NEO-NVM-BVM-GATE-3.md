# NEO NVM / BVM — Bitcoin Core validation gate

Project 144 · NEO-VM-G3 · October 29, 2026

This gate brings the approved Gate 1 local runtime into the existing Gate 2
implementation in PR #1268. Both compile through one Bitcoin Script emitter.
It adds native acceptance/rejection checks on a disposable Bitcoin Core 31.1
regtest instance, plus independent witness and transaction-context binding.

## What is implemented

| Component | Role | Evidence |
| --- | --- | --- |
| NEO NVM | Strict Bitcoin contract compilation | `core/neo-nvm/runtime.mjs`, `server/neo-vm/nvm.mjs` |
| NEO BVM local profile | Bounded witness-v0 Script subset evaluation | `core/neo-bvm/runtime.mjs` |
| NEO BVM Core adapter | Regtest UTXO, witness, fee and mempool checks | `server/neo-vm/bvm-regtest.mjs` |
| Shared Core transport | Reuses NEO's existing Bitcoin RPC client, with a five-method allowlist | `server/neo-vm/shared-bitcoin-core.mjs` |
| Native validation harness | Own isolated test node, native Core assertions, cleanup | `scripts/neo-vm-core-gate.mjs` |

The two explicit NVM input formats remain compatible:

- Core format: `{schemaVersion:1,family:"bitcoin",network:"regtest",kind:"sha256-preimage-32-v1",digestHex:"..."}`.
- Server format: `{version:1,network:"bitcoin-regtest",contract:{kind:"sha256-preimage",digest:"..."}}`.
  It also accepts `sha256-preimage-32`, which produces exactly the core format's
  fixed-length script. The original variable-length contract remains unchanged.

Both profiles compile into existing P2WSH Script. There is no EVM dependency,
Solidity compiler, Ethereum bridge, ETH requirement or new gas token. These are
NEO project component names, distinct from the existing BitVM project and the
separate Neo blockchain's NeoVM. Bitcoin consensus is unchanged.

## Native validation evidence

The source binary was downloaded from Bitcoin Core's official release site.
Its SHA-256 checksum matched both the signed release checksum list and the
fanquake Guix attestation. The checksum-list signature was verified against
the pinned primary fingerprint
`E777299FC265DD04793070EB944D35F9AC3DB76A`.

- Bitcoin Core: 31.1.0; RPC version `310100`.
- Release archive SHA-256:
  `b80d9c3e04da78fb6f0569685673418cf686fadba9042d926d13fb87ff503f9e`.
- bitcoind executable SHA-256:
  `986e63b3c8770f08d0059820ad3dd085d1ab9e1bea23946c243f858a06888a08`.
- Fresh data directory; wallet disabled; networking disabled; zero peers.
- Public disposable fixtures only. The harness mines regtest funding blocks
  and simulates a reorg, then stops its own node and removes its data directory.
- Application signing and broadcasts: zero. The mempool remains unchanged.

Thirteen assertions cover both correct contract profiles; wrong preimages;
the fixed-length profile with a 31-byte preimage; altered witnessScript;
extra stack items; a 521-byte witness; zero, negative and excessive fees;
funding removal by reorg; and recovery after reconsidering the chain.

Script success and mempool policy success are reported separately. A valid
Script with zero fees fails Core relay policy. Conversely, a fee can pass
Core's ceiling while exceeding NEO's stricter 100,000-satoshi absolute cap.
The harness verifies both distinctions. `testmempoolaccept` neither broadcasts
nor proves final confirmation.

The machine-readable selected-vector results and binary provenance are in
[`evidence/neo-vm-gate-3.json`](evidence/neo-vm-gate-3.json).

## Local repository checks

- VM unit suite: 62 passed, zero failures or skips.
- Native Core gate: 13 selected scenarios passed.
- Full configured repository suite: 940 passed, zero failures, one skipped
  KI-015 Postgres integration test without isolated database configuration.
- Repository build passed, retaining the existing frontend bundle-size warning.
- Architecture audit: zero errors; three existing gap warnings. Registry
  tests: three passed. Workflow YAML parsed successfully.

## Adapter boundaries

The adapter requires regtest, exactly one input, an empty native-witness
scriptSig, exactly two witness items, and the compiled witnessScript. It
binds Core's mempool response to both decoded txid and wtxid, enforces weight
at most 400,000 and a fee between zero and 100,000 satoshis, and refuses a
Core acceptance that disagrees with local supported-Script evaluation.
The fee cap is a validation limit; the adapter cannot spend funds.

The application's five permitted RPC methods are getblockchaininfo,
getnetworkinfo, gettxout, decoderawtransaction and testmempoolaccept.
Fixture mining and reorg RPCs are confined to the separate test harness's
owned node. No external node endpoint is accepted by that harness.

The local evaluator remains deliberately incomplete: data pushes, small
integers, VERIFY, DROP, DUP, SIZE, EQUAL/EQUALVERIFY and SHA256 are supported;
all other opcodes fail closed. It bounds scripts to 10,000 bytes, stack
elements to 520 bytes, stack depth to 1,000 and non-push operations to 201.
Pure local receipts remain unsigned summary checksums, excluding preimages;
they are not Core attestations, identity evidence or inclusion proofs.

A hashlock authorizes anyone who knows its preimage. There is no owner
signature or refund path in these templates. Use only public disposable
regtest fixtures; no production custody or signing is enabled.

## Run and reproduce

```bash
npm run neo-vm:test
npm run neo-vm:demo
BITCOIND_PATH=/absolute/path/to/verified/bitcoin-31.1/bin/bitcoind npm run neo-vm:core
```

The explicit Core command requires a verified binary; it never silently
skips. CI downloads the exact release archive with the pinned checksum,
runs the native harness and uploads its JSON evidence. Ordinary unit tests
use Node built-ins and require no Bitcoin Core node.

## Deployment and next milestone

The validated environment is an isolated local test node. Counterparty's
operator node, its binary installation, production RPC access and live wallet
flows have not been independently verified here. Reusing the existing RPC
transport does not establish that those services are connected.

The project register, inventory, integration checklist, decisions and backlog
are in [`architecture/neo-virtual-machines.json`](../architecture/neo-virtual-machines.json).
The next milestone is reviewed signature/refund templates and PSBT
authorization tests, followed by a verified operator-host staging deployment.
NEOpass, NeoMask, NEO Counter and Counterparty/NOMNI integrations remain pending.

## Primary references

- [Bitcoin Core 31.1 release](https://bitcoincore.org/en/releases/31.1/)
- [Download verification](https://bitcoincore.org/en/download/)
- [Guix release attestations](https://github.com/bitcoin-core/guix.sigs/tree/main/31.1/fanquake)
- [BIP 141: P2WSH](https://github.com/bitcoin/bips/blob/master/bip-0141.mediawiki)
- [Core testmempoolaccept RPC](https://bitcoincore.org/en/doc/31.0.0/rpc/rawtransactions/testmempoolaccept/)
