import { compileNvmContract, runNvmContract } from '../core/neo-nvm/runtime.mjs'

// Public test data. Never fund this hashlock: everyone knows its preimage.
const contract = {
  schemaVersion: 1, family: 'bitcoin', network: 'regtest',
  kind: 'sha256-preimage-32-v1',
  digestHex: '66687aadf862bd776c8fc18b8e9f8e20089714856ee233b3902a591d0d5f2925',
}
console.log(JSON.stringify({
  gate: 'NEO-VM-G1',
  scope: 'local-only demo; independent Core evidence is recorded by the Gate 3 harness',
  compiled: compileNvmContract(contract),
  correctPreimage: runNvmContract(contract, { preimageHex: '00'.repeat(32) }),
  wrongPreimage: runNvmContract(contract, { preimageHex: '01'.repeat(32) }),
}, null, 2))
