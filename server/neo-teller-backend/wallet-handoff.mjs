import crypto from 'node:crypto'
import {assertNoSecrets} from './composer.mjs'

const HEX_RE=/^[0-9a-fA-F]+$/
const ADAPTERS={
  NEOPAY:{id:'NEOPAY',mode:'LOCAL_WALLET',description:'NEOpay user-controlled wallet signs locally'},
  BROWSER_WALLET:{id:'BROWSER_WALLET',mode:'LOCAL_WALLET',description:'Compatible browser wallet signs locally'},
  HARDWARE_WALLET:{id:'HARDWARE_WALLET',mode:'HARDWARE',description:'Hardware wallet signs outside NEO Teller'},
  EXTERNAL:{id:'EXTERNAL',mode:'OUT_OF_BAND',description:'External wallet/signing device returns signed transaction'}
}

export function listWalletAdapters(){return Object.values(ADAPTERS)}

export function buildSigningHandoff(input={}){
  assertNoSecrets(input)
  const unsignedTransaction=String(input.unsignedTransaction||'').trim()
  const intentId=String(input.intentId||'').trim()
  const adapter=String(input.adapter||'NEOPAY').trim().toUpperCase()
  if(!intentId) throw new Error('MISSING_INTENT_ID')
  if(unsignedTransaction.length<20||unsignedTransaction.length%2!==0||!HEX_RE.test(unsignedTransaction)) throw new Error('INVALID_UNSIGNED_TRANSACTION')
  if(!ADAPTERS[adapter]) throw new Error('UNSUPPORTED_WALLET_ADAPTER')
  return {intentId,adapter:ADAPTERS[adapter],unsignedTransaction,signingLocation:'USER_DEVICE',privateKeyTransfer:false,returnContract:{signedTransaction:'hex',intentId:'same intent id'}}
}

export function acceptSignedTransaction(input={}){
  assertNoSecrets(input)
  const signedTransaction=String(input.signedTransaction||'').trim()
  const intentId=String(input.intentId||'').trim()
  const adapter=String(input.adapter||'EXTERNAL').trim().toUpperCase()
  if(!intentId) throw new Error('MISSING_INTENT_ID')
  if(signedTransaction.length<20||signedTransaction.length%2!==0||!HEX_RE.test(signedTransaction)) throw new Error('INVALID_SIGNED_TRANSACTION')
  if(!ADAPTERS[adapter]) throw new Error('UNSUPPORTED_WALLET_ADAPTER')
  const fingerprint=crypto.createHash('sha256').update(signedTransaction).digest('hex')
  return {intentId,adapter:ADAPTERS[adapter],signedTransaction,fingerprint,status:'READY_FOR_EXPLICIT_BROADCAST',broadcast:{automatic:false,enabled:false,requiresSeparateUserAction:true}}
}
