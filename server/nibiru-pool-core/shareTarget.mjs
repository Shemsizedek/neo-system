import crypto from 'node:crypto'
import {divideTargetByDifficulty,targetFromCompactBits} from './protocolMath.mjs'

export const DIFF1_TARGET=BigInt('0x00000000ffff0000000000000000000000000000000000000000000000000000')

export function targetFromDifficulty(difficulty){
  return divideTargetByDifficulty(DIFF1_TARGET,difficulty)
}

export function targetFromBits(bits){
  return targetFromCompactBits(bits)
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
