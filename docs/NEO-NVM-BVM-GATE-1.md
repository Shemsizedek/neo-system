# NEO NVM / BVM — Gate 1

Project 144 · NEO-VM-G1 · October 29, 2026

Gate 1 implements a deterministic local compiler and a bounded Bitcoin Script
subset evaluator. It does not change Bitcoin consensus. A result of
`LOCAL_ACCEPT` means this implementation's supported subset passed locally;
Bitcoin Core has not validated a transaction.

## Naming and architecture decision

| Name | Purpose | Gate 1 implementation |
| --- | --- | --- |
| NEO NVM — NEO Virtual Machine | NEO contract format, compilation and execution orchestration | `core/neo-nvm/runtime.mjs` |
| NEO BVM — Bitcoin Virtual Machine | Bitcoin execution adapter | `core/neo-bvm/runtime.mjs`, a local witness-v0 subset evaluator |
| Bitcoin Core | Independent transaction and consensus validation | Not connected in this gate |

These names identify components of **NEO System — Project 144**. They do not
claim to be Bitcoin's official VM, the existing BitVM project, or the separate
Neo blockchain's NeoVM. EVM is Ethereum's execution environment; it is not
required to build Bitcoin software. This implementation has no EVM runtime,
Solidity compiler, ETH requirement or new gas token.

NVM accepts an explicit `family: "bitcoin"` and exact schema. Unsupported
families, bytecode fields, networks and contract types are rejected. Byte
values can overlap between instruction sets, so the code never guesses a VM
family from raw bytes. This gate does not audit or migrate unrelated existing
NEO integrations.

## Runnable contract

```js
import { compileNvmContract, runNvmContract } from '../core/neo-nvm/runtime.mjs'

const contract = {
  schemaVersion: 1,
  family: 'bitcoin',
  network: 'regtest',
  kind: 'sha256-preimage-32-v1',
  digestHex: '66687aadf862bd776c8fc18b8e9f8e20089714856ee233b3902a591d0d5f2925',
}
const compiled = compileNvmContract(contract)
const result = runNvmContract(contract, { preimageHex: '00'.repeat(32) })
// result.status === 'LOCAL_ACCEPT'; result.bitcoinCoreValidated === false
```

The example preimage is public test data. A hashlock can be spent by anyone
who knows its preimage. There is no owner signature or refund path in this
template; never fund the example or use this template for production custody.

The compiler emits:

```text
OP_SIZE <32> OP_EQUALVERIFY OP_SHA256 <32-byte digest> OP_EQUAL
```

Its witnessScript is 39 bytes. The native P2WSH output script is
`00 20 SHA256(witnessScript)`. The witness consists of a single 32-byte
preimage followed by the witnessScript. The evaluator independently checks
the script commitment, executes the supported instructions, and requires
exactly one true result. P2WSH script bytes are network independent; the
`regtest` restriction is an application boundary, not an on-chain restriction.

```bash
npm run neo-vm:test
npm run neo-vm:demo
```

The demo compiles the contract and shows accepted and rejected preimages.
The test suite is included in `npm test`, which existing repository CI runs.
The modules require Node.js 24 and only Node built-ins.

## Execution boundary

The BVM profile supports direct data pushes, PUSHDATA1/2/4, OP_0,
OP_1NEGATE, OP_1 through OP_16, OP_VERIFY, OP_DROP, OP_DUP, OP_SIZE,
OP_EQUAL, OP_EQUALVERIFY and OP_SHA256. Every other opcode is rejected,
including signatures, timelocks and conditional execution. No operation is
stubbed to return successful signature or authorization verification.

The profile bounds scripts to 10,000 bytes, elements to 520 bytes, stack
depth to 1,000, non-push operations to 201 and execution steps to 10,000.
It follows Bitcoin truth values, including negative zero, and signed-magnitude
little-endian OP_SIZE results. This subset is incomplete: it does not check
transaction amounts, fees, UTXOs, scriptSig, signatures, timelocks, relay
policy or every consensus rule. Nonminimal pushes can evaluate locally;
no mempool acceptance is implied. It is neither Turing-complete nor a new
Bitcoin consensus engine.

Malformed NVM contract or witness envelopes throw a `VmInputError` with a
stable `code`. BVM evaluation returns `LOCAL_ACCEPT` or `LOCAL_REJECT` and
a stable reason. A structurally valid but wrong preimage returns
`LOCAL_REJECT`; oversized or malformed NVM inputs are rejected before execution.

NVM normalizes contract field order and hex case before hashing. Its
`contractId` and `receiptHash` use distinct versioned hash domains. Receipts
contain local outcome and operation counts, excluding preimages and stack
contents. The receipt checksum is unsigned and does not bind a particular
witness: different witnesses producing the same summary can share it. It
proves neither execution, identity, authorization nor Bitcoin inclusion.
No clock, random source, filesystem, network, key store or caller-supplied
executor participates in execution.

## Evidence, dependencies and next gate

Gate 1 tests cover fixed script/output fixtures derived independently with
Python hashlib, a known SHA-256 digest, accepted and rejected preimages,
script mutations, malformed pushdata, negative zero, stack underflow,
resource limits, unsupported opcodes and deterministic receipts. These are
local unit tests; no claim is made that they are Bitcoin Core differential tests.

The scoped project register, inventory, integration checklist, decision log
and prioritized backlog are in
[`architecture/neo-virtual-machines.json`](../architecture/neo-virtual-machines.json).
NEOpass, NeoMask, NEO Counter and Counterparty/NOMNI adapters remain separate
dependencies and are not connected by this gate. No production service,
wallet, payment flow or deployed authentication behavior changes here.

**Next milestone: NEO-VM-G2.** Run the compiled contract and rejection cases
against a pinned Bitcoin Core node on an isolated regtest network. Record
transaction-context and mempool results separately from local results.
Then review signature/timelock templates and PSBT authorization boundaries.

## Local validation record

- VM tests: 46 passed, zero failures or skips.
- Full repository suite: 924 passed, zero failures, one skipped (KI-015
  Postgres durable ledger integration test); 925 total.
- Repository build: passed, with the existing large frontend bundle warning.
- Architecture audit: zero errors; three existing implementation-gap warnings.
- Architecture registry tests: three passed.
- Demo: correct preimage accepted locally; wrong preimage rejected locally.
- Bitcoin Core and production deployment: not performed.

## Primary references

- [BIP 141: witness programs and P2WSH](https://github.com/bitcoin/bips/blob/master/bip-0141.mediawiki)
- [Bitcoin Core v30.0 interpreter](https://github.com/bitcoin/bitcoin/blob/v30.0/src/script/interpreter.cpp)
- [Bitcoin Core v30.0 Script limits and opcodes](https://github.com/bitcoin/bitcoin/blob/v30.0/src/script/script.h)
- [EVM documentation](https://ethereum.org/en/developers/docs/evm/)
- [BitVM](https://bitvm.org/)
- [Neo blockchain NeoVM documentation](https://developers.neo.org/docs/n3/foundation/neovm)
