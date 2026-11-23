import {createHash} from 'node:crypto'

const HEX32=/^[0-9a-f]{64}$/i
const sha256=buffer=>createHash('sha256').update(buffer).digest('hex')
function exactKeys(value,keys,label){
  if(!value||typeof value!=='object'||Array.isArray(value)||Object.getPrototypeOf(value)!==Object.prototype)throw new Error(label+'_OBJECT_REQUIRED')
  const received=Object.keys(value)
  if(received.some(key=>!keys.includes(key))||keys.some(key=>!Object.hasOwn(value,key)))throw new Error(label+'_FIELDS_INVALID')
}

// NVM is a deliberately restricted Bitcoin Script compiler, NOT a consensus VM.
export function compileNvm(program){
  exactKeys(program,['version','network','contract'],'NVM_PROGRAM')
  if(program.version!==1)throw new Error('NVM_VERSION_UNSUPPORTED')
  if(program.network!=='bitcoin-regtest')throw new Error('NVM_BITCOIN_REGTEST_ONLY')
  exactKeys(program.contract,['kind','digest'],'NVM_CONTRACT')
  if(program.contract.kind!=='sha256-preimage')throw new Error('NVM_CONTRACT_UNSUPPORTED')
  if(typeof program.contract.digest!=='string'||!HEX32.test(program.contract.digest))throw new Error('NVM_DIGEST_INVALID')
  const digest=program.contract.digest.toLowerCase()
  // OP_SHA256 PUSH32 <digest> OP_EQUAL. A hashlock is NOT an authorization signature.
  const witnessScript='a820'+digest+'87'
  const programId=sha256(Buffer.from(witnessScript,'hex'))
  const scriptPubKey='0020'+programId
  return Object.freeze({version:1,network:'bitcoin-regtest',kind:'sha256-preimage',digest,witnessScript,scriptPubKey,programId})
}

export function digestPreimage(preimage){
  if(!Buffer.isBuffer(preimage)||preimage.length===0||preimage.length>520)throw new Error('NVM_PREIMAGE_LENGTH_INVALID')
  return sha256(preimage)
}
