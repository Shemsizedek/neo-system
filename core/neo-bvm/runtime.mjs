import { createHash } from 'node:crypto'
import { decodeHex, requireFields, requireRegtest, VmInputError } from './input.mjs'

export const BVM_PROFILE = 'neo-bvm/p2wsh-subset-v1'
export const BVM_LIMITS = Object.freeze({
  scriptBytes: 10_000,
  elementBytes: 520,
  stackItems: 1_000,
  nonPushOperations: 201,
  steps: 10_000,
})

export const sha256Hex = bytes => createHash('sha256').update(bytes).digest('hex')

// Bitcoin Script truth includes the negative-zero encodings 80, 0080, ... .
function castToBool(bytes) {
  for (let i = 0; i < bytes.length; i++) {
    if (bytes[i] !== 0) return !(i === bytes.length - 1 && bytes[i] === 0x80)
  }
  return false
}

function encodeSize(size) {
  const bytes = []
  for (let n = size; n; n >>>= 8) bytes.push(n & 0xff)
  if (bytes.length && (bytes.at(-1) & 0x80)) bytes.push(0)
  return Buffer.from(bytes)
}

/**
 * Bounded, local witness-v0 subset evaluator, NOT a consensus validator.
 * witnessHex contains the initial stack followed by the witnessScript.
 * No transaction, UTXO, signature, timelock, RPC, signing or broadcast support.
 */
export function evaluateP2wsh(input) {
  let steps = 0
  let operations = 0
  const stack = []
  const outcome = (status, reason) => Object.freeze({
    engine: BVM_PROFILE, network: 'regtest', status, reason,
    steps, operations, finalStackItems: stack.length,
    bitcoinCoreValidated: false,
  })
  const fail = code => { throw new VmInputError(code) }
  const need = count => { if (stack.length < count) fail('STACK_UNDERFLOW') }
  const push = bytes => {
    if (bytes.length > BVM_LIMITS.elementBytes) fail('ELEMENT_SIZE')
    if (stack.length >= BVM_LIMITS.stackItems) fail('STACK_SIZE')
    stack.push(bytes)
  }

  try {
    requireFields(input, ['network', 'scriptPubKeyHex', 'witnessHex'])
    requireRegtest(input.network)
    const output = decodeHex(input.scriptPubKeyHex, 34)
    if (output.length !== 34 || output[0] !== 0 || output[1] !== 32) fail('P2WSH_REQUIRED')
    if (!Array.isArray(input.witnessHex) || !input.witnessHex.length ||
        input.witnessHex.length > BVM_LIMITS.stackItems + 1) fail('WITNESS_SIZE')
    const script = decodeHex(input.witnessHex.at(-1), BVM_LIMITS.scriptBytes, 'SCRIPT_SIZE_OR_HEX')
    if (sha256Hex(script) !== output.subarray(2).toString('hex')) fail('SCRIPT_HASH_MISMATCH')
    for (let i = 0; i < input.witnessHex.length - 1; i++) {
      push(decodeHex(input.witnessHex[i], BVM_LIMITS.elementBytes, 'ELEMENT_SIZE_OR_HEX'))
    }

    for (let pc = 0; pc < script.length;) {
      if (++steps > BVM_LIMITS.steps) fail('STEP_LIMIT')
      const opcode = script[pc++]
      if (opcode > 0x60 && ++operations > BVM_LIMITS.nonPushOperations) fail('OPERATION_LIMIT')
      if (opcode <= 0x4e) {
        let length = opcode
        if (opcode >= 0x4c) {
          const width = 2 ** (opcode - 0x4c)
          if (pc + width > script.length) fail('TRUNCATED_PUSH')
          length = script.readUIntLE(pc, width)
          pc += width
        }
        if (length > BVM_LIMITS.elementBytes) fail('ELEMENT_SIZE')
        if (pc + length > script.length) fail('TRUNCATED_PUSH')
        push(script.subarray(pc, pc + length))
        pc += length
      } else if (opcode === 0x4f) {
        push(Buffer.from([0x81])) // OP_1NEGATE
      } else if (opcode >= 0x51 && opcode <= 0x60) {
        push(Buffer.from([opcode - 0x50]))
      } else {
        switch (opcode) {
          case 0x69: // OP_VERIFY
            need(1)
            if (!castToBool(stack.at(-1))) fail('VERIFY_FAILED')
            stack.pop()
            break
          case 0x75: // OP_DROP
            need(1)
            stack.pop()
            break
          case 0x76: // OP_DUP
            need(1)
            push(Buffer.from(stack.at(-1)))
            break
          case 0x82: // OP_SIZE
            need(1)
            push(encodeSize(stack.at(-1).length))
            break
          case 0x87: // OP_EQUAL
          case 0x88: { // OP_EQUALVERIFY
            need(2)
            const equal = stack.pop().equals(stack.pop())
            if (opcode === 0x88) {
              if (!equal) fail('EQUALVERIFY_FAILED')
            } else push(equal ? Buffer.from([1]) : Buffer.alloc(0))
            break
          }
          case 0xa8: // OP_SHA256
            need(1)
            push(createHash('sha256').update(stack.pop()).digest())
            break
          default:
            fail('UNSUPPORTED_OPCODE')
        }
      }
    }
    if (stack.length !== 1) fail('CLEANSTACK_REQUIRED')
    if (!castToBool(stack[0])) fail('EVAL_FALSE')
    return outcome('LOCAL_ACCEPT', 'SUPPORTED_SUBSET_PASSED')
  } catch (error) {
    if (!(error instanceof VmInputError)) throw error
    return outcome('LOCAL_REJECT', error.code)
  }
}
