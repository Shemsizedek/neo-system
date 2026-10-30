import { BVM_PROFILE, evaluateP2wsh, sha256Hex } from '../neo-bvm/runtime.mjs'
import { decodeHex, requireFields, requireRegtest, VmInputError } from '../neo-bvm/input.mjs'
import { compileSha256Hashlock } from '../neo-bvm/hashlock.mjs'

export const NVM_PROFILE = 'neo-nvm/contract-v1'
const CONTRACT_FIELDS = ['schemaVersion', 'family', 'network', 'kind', 'digestHex']

/** Compile the one supported NEO contract into existing Bitcoin witness-v0 Script. */
export function compileNvmContract(input) {
  requireFields(input, CONTRACT_FIELDS)
  if (input.schemaVersion !== 1) throw new VmInputError('UNSUPPORTED_SCHEMA')
  if (input.family !== 'bitcoin') throw new VmInputError('BITCOIN_REQUIRED')
  requireRegtest(input.network)
  if (input.kind !== 'sha256-preimage-32-v1') throw new VmInputError('UNSUPPORTED_CONTRACT')
  const digest = decodeHex(input.digestHex, 32)
  if (digest.length !== 32) throw new VmInputError('DIGEST_SIZE')
  const contract = Object.freeze({
    schemaVersion: 1, family: 'bitcoin', network: 'regtest',
    kind: 'sha256-preimage-32-v1', digestHex: digest.toString('hex'),
  })
  // OP_SIZE <32> OP_EQUALVERIFY OP_SHA256 <digest> OP_EQUAL
  const { witnessScriptHex, scriptPubKeyHex } = compileSha256Hashlock(contract.digestHex, 32)
  const contractId = sha256Hex(Buffer.from(`${NVM_PROFILE}\0${JSON.stringify(contract)}`))
  return Object.freeze({
    schemaVersion: 1, compiler: NVM_PROFILE, target: BVM_PROFILE,
    contractId, contract, witnessScriptHex,
    scriptPubKeyHex,
    bitcoinCoreValidated: false,
  })
}

/** Local orchestration only. The preimage never appears in the returned receipt. */
export function runNvmContract(contract, witness) {
  const compiled = compileNvmContract(contract)
  requireFields(witness, ['preimageHex'])
  const preimage = decodeHex(witness.preimageHex, 520)
  const evaluation = evaluateP2wsh({
    network: compiled.contract.network,
    scriptPubKeyHex: compiled.scriptPubKeyHex,
    witnessHex: [preimage.toString('hex'), compiled.witnessScriptHex],
  })
  // Fixed field order and domain separation give a reproducible summary ID.
  // This is a checksum, not a signature, attestation or Bitcoin inclusion proof.
  const receipt = Object.freeze({
    schemaVersion: 1, orchestrator: NVM_PROFILE,
    contractId: compiled.contractId,
    scriptPubKeyHex: compiled.scriptPubKeyHex,
    ...evaluation,
  })
  return Object.freeze({
    ...receipt,
    receiptHash: sha256Hex(Buffer.from(`neo-nvm/receipt-v1\0${JSON.stringify(receipt)}`)),
  })
}
