import assert from 'node:assert/strict'
import test from 'node:test'
import { BVM_LIMITS, evaluateP2wsh, sha256Hex } from './runtime.mjs'

function evaluate(scriptHex, stack = []) {
  return evaluateP2wsh({
    network: 'regtest',
    scriptPubKeyHex: `0020${sha256Hex(Buffer.from(scriptHex, 'hex'))}`,
    witnessHex: [...stack, scriptHex],
  })
}

test('matches a fixed P2WSH OP_1 fixture independently derived with Python hashlib', () => {
  const result = evaluateP2wsh({
    network: 'regtest',
    scriptPubKeyHex: '00204ae81572f06e1b88fd5ced7a1a000945432e83e1551e6f721ee9c00b8cc33260',
    witnessHex: ['51'],
  })
  assert.equal(result.status, 'LOCAL_ACCEPT')
  assert.equal(result.steps, 1)
  assert.equal(result.operations, 0)
  assert.equal(result.bitcoinCoreValidated, false)
})

test('SHA256 matches the published abc digest; a wrong witness fails', () => {
  const script = 'a820ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad87'
  assert.equal(evaluate(script, ['616263']).status, 'LOCAL_ACCEPT')
  assert.equal(evaluate(script, ['616264']).reason, 'EVAL_FALSE')
})

test('rejects a modified witnessScript before evaluating it', () => {
  const result = evaluateP2wsh({
    network: 'regtest',
    scriptPubKeyHex: '00204ae81572f06e1b88fd5ced7a1a000945432e83e1551e6f721ee9c00b8cc33260',
    witnessHex: ['52'],
  })
  assert.equal(result.reason, 'SCRIPT_HASH_MISMATCH')
  assert.equal(result.steps, 0)
})

for (const value of ['', '00', '80', '0000', '0080', '000080']) {
  test(`Bitcoin false encoding ${value || '(empty)'} is rejected`, () => {
    assert.equal(evaluate('', [value]).reason, 'EVAL_FALSE')
    assert.equal(evaluate('6951', [value]).reason, 'VERIFY_FAILED')
  })
}
for (const value of ['01', '81', '8000', '0180']) {
  test(`Bitcoin true encoding ${value} passes`, () => {
    assert.equal(evaluate('', [value]).status, 'LOCAL_ACCEPT')
    assert.equal(evaluate('6951', [value]).status, 'LOCAL_ACCEPT')
  })
}

test('requires exactly one true result, including an otherwise true dirty stack', () => {
  assert.equal(evaluate('').reason, 'CLEANSTACK_REQUIRED')
  assert.equal(evaluate('5151').reason, 'CLEANSTACK_REQUIRED')
  assert.equal(evaluate('51', ['01']).reason, 'CLEANSTACK_REQUIRED')
})

for (const opcode of ['69', '75', '76', '82', '87', '88', 'a8']) {
  test(`opcode ${opcode} detects stack underflow`, () => {
    assert.equal(evaluate(opcode).reason, 'STACK_UNDERFLOW')
  })
}

test('equality, verification, duplication, drop and small integers have stack semantics', () => {
  assert.equal(evaluate('517687').status, 'LOCAL_ACCEPT')
  assert.equal(evaluate('515288').reason, 'EQUALVERIFY_FAILED')
  assert.equal(evaluate('51518851').status, 'LOCAL_ACCEPT')
  assert.equal(evaluate('4f6951').status, 'LOCAL_ACCEPT')
  for (let opcode = 0x51; opcode <= 0x60; opcode++) {
    assert.equal(evaluate(`${opcode.toString(16)}75${opcode.toString(16)}`).status, 'LOCAL_ACCEPT')
  }
})

test('OP_SIZE uses signed-magnitude little-endian Script numbers', () => {
  for (const [size, encodedSize] of [[0, '00'], [32, '0120'], [128, '028000'], [255, '02ff00'], [256, '020001'], [520, '020802']]) {
    assert.equal(evaluate(`82${encodedSize}887551`, ['01'.repeat(size)]).status, 'LOCAL_ACCEPT')
  }
})

test('parses direct pushes and PUSHDATA1/2/4 as data, not opcodes', () => {
  for (const prefix of ['01', '4c01', '4d0100', '4e01000000']) {
    assert.equal(evaluate(`${prefix}ac750151`).status, 'LOCAL_ACCEPT')
  }
  assert.equal(evaluate('4d0802' + '01'.repeat(520) + '7551').status, 'LOCAL_ACCEPT')
})

for (const script of ['01', '02ff', '4c', '4c01', '4d00', '4d0100', '4e000000', '4e01000000']) {
  test(`truncated data push ${script} fails`, () => {
    assert.equal(evaluate(script).reason, 'TRUNCATED_PUSH')
  })
}

test('rejects oversized elements before allocating pushed data', () => {
  assert.equal(evaluate('4d0902' + '00'.repeat(521)).reason, 'ELEMENT_SIZE')
  assert.equal(evaluate('4effffffff').reason, 'ELEMENT_SIZE')
  assert.equal(evaluate('7551', ['00'.repeat(521)]).reason, 'ELEMENT_SIZE_OR_HEX')
})

test('enforces the witness-v0 operation boundary and does not charge pushes as operations', () => {
  assert.equal(evaluate('76'.repeat(100) + '75'.repeat(100), ['01']).status, 'LOCAL_ACCEPT')
  const boundary = evaluate('76'.repeat(100) + '75'.repeat(100) + '6951', ['01'])
  assert.equal(boundary.operations, 201)
  assert.equal(boundary.status, 'LOCAL_ACCEPT')
  assert.equal(evaluate('76'.repeat(101) + '75'.repeat(101), ['01']).reason, 'OPERATION_LIMIT')
  assert.equal(evaluate('51'.repeat(1_000)).reason, 'CLEANSTACK_REQUIRED')
})

test('enforces stack and total script limits', () => {
  assert.equal(evaluate('51'.repeat(1_001)).reason, 'STACK_SIZE')
  assert.equal(evaluate('51'.repeat(10_001)).reason, 'SCRIPT_SIZE_OR_HEX')
  const stack = Array(1_000).fill('')
  assert.equal(evaluate('76', stack).reason, 'STACK_SIZE')
  assert.equal(evaluate('51', [...stack, '']).reason, 'WITNESS_SIZE')
  assert.equal(BVM_LIMITS.elementBytes, 520)
})

test('every unsupported opcode fails closed, including signatures and timelocks', () => {
  const supported = new Set([0x4f, ...Array.from({ length: 16 }, (_, i) => 0x51 + i), 0x69, 0x75, 0x76, 0x82, 0x87, 0x88, 0xa8])
  for (let opcode = 0x4f; opcode <= 0xff; opcode++) {
    if (!supported.has(opcode)) assert.equal(evaluate(opcode.toString(16)).reason, 'UNSUPPORTED_OPCODE')
  }
})

test('rejects invalid envelopes and non-regtest networks without throwing', () => {
  const valid = { network: 'regtest', scriptPubKeyHex: `0020${sha256Hex(Buffer.from('51', 'hex'))}`, witnessHex: ['51'] }
  for (const value of [null, [], '6000', { ...valid, family: 'evm' }, { ...valid, witnessHex: [] },
    { ...valid, witnessHex: Array(2) }, { ...valid, scriptPubKeyHex: 'zz' },
    { ...valid, scriptPubKeyHex: '5120' + '00'.repeat(32) }, { ...valid, witnessHex: ['0x51'] }]) {
    assert.equal(evaluateP2wsh(value).status, 'LOCAL_REJECT')
  }
  for (const network of ['mainnet', 'main', 'signet', 'testnet', 'ethereum', undefined]) {
    assert.equal(evaluateP2wsh({ ...valid, network }).reason, 'REGTEST_ONLY')
  }
})
