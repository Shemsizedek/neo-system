import { decodeHex, VmInputError } from './input.mjs'
import { sha256Hex } from './runtime.mjs'

// One Script emitter shared by both NVM input formats.
export function compileSha256Hashlock(digestHex, exactPreimageBytes = null) {
  const digest = decodeHex(digestHex, 32)
  if (digest.length !== 32) throw new VmInputError('DIGEST_SIZE')
  if (exactPreimageBytes !== null && exactPreimageBytes !== 32) {
    throw new VmInputError('UNSUPPORTED_PREIMAGE_SIZE')
  }
  const prefix = exactPreimageBytes === 32 ? '82012088' : ''
  const witnessScriptHex = `${prefix}a820${digest.toString('hex')}87`
  const scriptHash = sha256Hex(Buffer.from(witnessScriptHex, 'hex'))
  return Object.freeze({ witnessScriptHex, scriptHash, scriptPubKeyHex: `0020${scriptHash}` })
}
