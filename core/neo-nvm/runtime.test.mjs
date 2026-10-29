import assert from 'node:assert/strict'
import test from 'node:test'
import { compileNvmContract, runNvmContract } from './runtime.mjs'

const DIGEST = '66687aadf862bd776c8fc18b8e9f8e20089714856ee233b3902a591d0d5f2925'
const contract = {
  schemaVersion: 1, family: 'bitcoin', network: 'regtest',
  kind: 'sha256-preimage-32-v1', digestHex: DIGEST,
}
const matchesCode = code => error => error.code === code

test('compiles to fixed Bitcoin Script bytes and an independently derived P2WSH commitment', () => {
  const result = compileNvmContract(contract)
  assert.equal(result.witnessScriptHex, `82012088a820${DIGEST}87`)
  assert.equal(result.scriptPubKeyHex, '0020bc25b8e2955bd7dd7b7b88d4edaa8ec03585b684801c34c3030ce32fbba0fed0')
  assert.equal(result.target, 'neo-bvm/p2wsh-subset-v1')
  assert.equal(result.bitcoinCoreValidated, false)
  assert.equal(Object.isFrozen(result.contract), true)
})

test('executes a correct preimage through NVM and BVM and produces only local evidence', () => {
  const receipt = runNvmContract(contract, { preimageHex: '00'.repeat(32) })
  assert.equal(receipt.status, 'LOCAL_ACCEPT')
  assert.equal(receipt.steps, 6)
  assert.equal(receipt.operations, 4)
  assert.equal(receipt.finalStackItems, 1)
  assert.equal(receipt.bitcoinCoreValidated, false)
  assert.match(receipt.receiptHash, /^[0-9a-f]{64}$/)
  assert.equal(Object.hasOwn(receipt, 'witnessHex'), false)
  assert.equal(Object.hasOwn(receipt, 'preimageHex'), false)
  assert.equal(Object.hasOwn(receipt, 'txid'), false)
})

test('wrong preimage and wrong lengths fail the generated script', () => {
  assert.equal(runNvmContract(contract, { preimageHex: '01'.repeat(32) }).reason, 'EVAL_FALSE')
  for (const size of [0, 1, 31, 33, 520]) {
    assert.equal(runNvmContract(contract, { preimageHex: '00'.repeat(size) }).reason, 'EQUALVERIFY_FAILED')
  }
})

test('normalization makes key order and hex case deterministic without mutating inputs', () => {
  const reordered = { digestHex: DIGEST.toUpperCase(), kind: contract.kind, network: 'regtest', family: 'bitcoin', schemaVersion: 1 }
  const witness = Object.freeze({ preimageHex: '00'.repeat(32) })
  assert.deepEqual(compileNvmContract(contract), compileNvmContract(reordered))
  assert.deepEqual(runNvmContract(Object.freeze({ ...contract }), witness), runNvmContract(reordered, witness))
  assert.equal(reordered.digestHex, DIGEST.toUpperCase())
})

test('a different contract or evaluation changes the receipt checksum', () => {
  const accepted = runNvmContract(contract, { preimageHex: '00'.repeat(32) })
  const rejected = runNvmContract(contract, { preimageHex: '01'.repeat(32) })
  const other = runNvmContract({ ...contract, digestHex: '00'.repeat(32) }, { preimageHex: '00'.repeat(32) })
  assert.notEqual(accepted.receiptHash, rejected.receiptHash)
  assert.notEqual(accepted.contractId, other.contractId)
})

test('rejects EVM and other contract families explicitly without format inference', () => {
  for (const family of ['evm', 'ethereum', 'neo', '', undefined]) {
    assert.throws(() => compileNvmContract({ ...contract, family }), matchesCode('BITCOIN_REQUIRED'))
  }
  assert.throws(() => compileNvmContract({ ...contract, bytecode: '60006000' }), matchesCode('INVALID_FIELDS'))
  assert.throws(() => compileNvmContract('60006000'), matchesCode('INVALID_RECORD'))
})

test('only schema 1, the exact contract type and regtest are enabled', () => {
  assert.throws(() => compileNvmContract({ ...contract, schemaVersion: '1' }), matchesCode('UNSUPPORTED_SCHEMA'))
  assert.throws(() => compileNvmContract({ ...contract, kind: 'arbitrary-js' }), matchesCode('UNSUPPORTED_CONTRACT'))
  for (const network of ['mainnet', 'testnet', 'signet', undefined]) {
    assert.throws(() => compileNvmContract({ ...contract, network }), matchesCode('REGTEST_ONLY'))
  }
})

test('rejects malformed, partial, extended, inherited and invalid digest inputs', () => {
  const inherited = Object.create(contract)
  for (const input of [null, [], {}, inherited, { ...contract, extra: true }, { ...contract, [Symbol('key')]: 1 }]) {
    assert.throws(() => compileNvmContract(input))
  }
  for (const digestHex of ['', '00'.repeat(31), '00'.repeat(33), '0x' + DIGEST, 'gg'.repeat(32), null, 42, '0']) {
    assert.throws(() => compileNvmContract({ ...contract, digestHex }))
  }
})

test('witness input is exact and bounded and cannot inject a different script or executor', () => {
  for (const witness of [null, {}, { preimageHex: '00'.repeat(32), script: '51' },
    { preimageHex: '00'.repeat(521) }, { preimageHex: 'x' }, { preimageHex: '0x00' }]) {
    assert.throws(() => runNvmContract(contract, witness))
  }
})
