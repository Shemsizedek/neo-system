import crypto from 'node:crypto'

const DIFF1_TARGET=BigInt('0x00000000ffff0000000000000000000000000000000000000000000000000000')

export function targetFromDifficulty(difficulty){
  const d=Number(difficulty)
  if(!Number.isFinite(d)||d<=0) throw new Error('INVALID_DIFFICULTY')
  return DIFF1_TARGET/BigInt(Math.max(1,Math.floor(d)))
}

export function targetFromBits(bits){
  if(typeof bits!=='string'||!/^[0-9a-f]{8}$/i.test(bits)) throw new Error('INVALID_BITS')
  const exponent=parseInt(bits.slice(0,2),16)
  const coefficient=BigInt(`0x${bits.slice(2)}`)
  return exponent<=3?coefficient>>BigInt(8*(3-exponent)):coefficient<<BigInt(8*(exponent-3))
}

export function hashMeetsTarget(hashHex,target){
  if(typeof hashHex!=='string'||!/^[0-9a-f]{64}$/i.test(hashHex)) throw new Error('INVALID_HASH')
  if(typeof target!=='bigint'||target<=0n) throw new Error('INVALID_TARGET')
  return BigInt(`0x${hashHex}`)<=target
}

export function doubleSha256Hex(headerHex){
  if(typeof headerHex!=='string'||headerHex.length!==160||!/^[0-9a-f]+$/i.test(headerHex)) throw new Error('INVALID_BLOCK_HEADER')
  const first=crypto.createHash('sha256').update(Buffer.from(headerHex,'hex')).digest()
  return crypto.createHash('sha256').update(first).digest().reverse().toString('hex')
}

export function verifyHeaderTargets({headerHex,difficulty,bits}){
  const hash=doubleSha256Hex(headerHex)
  const shareTarget=targetFromDifficulty(difficulty)
  const networkTarget=targetFromBits(bits)
  return Object.freeze({computedHash:hash,meetsShareTarget:hashMeetsTarget(hash,shareTarget),meetsNetworkTarget:hashMeetsTarget(hash,networkTarget),shareTarget:shareTarget.toString(16).padStart(64,'0'),networkTarget:networkTarget.toString(16).padStart(64,'0')})
}
