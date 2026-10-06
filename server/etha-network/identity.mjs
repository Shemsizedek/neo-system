import {createPrivateKey,createPublicKey,sign} from 'node:crypto'

export const SERVICE_ID='crown:btc:app:etha-network'
export const KEY_ID='etha-network-prod-1'
export function workloadIdentity(privatePem){
  const privateKey=createPrivateKey(privatePem),jwk=createPublicKey(privateKey).export({format:'jwk'})
  if(jwk.kty!=='OKP'||jwk.crv!=='Ed25519'||!jwk.x)throw new Error('ETHA workload key must be Ed25519')
  return{protocol:'CROWN/1',gate:'CROWN-027',service_id:SERVICE_ID,key_id:KEY_ID,algorithm:'Ed25519',public_key:jwk.x,private_key_exposed:false}
}
export function signCrownInput(privatePem,signingInput){
  const bytes=Buffer.from(signingInput.replace(/-/g,'+').replace(/_/g,'/'),'base64')
  return sign(null,bytes,createPrivateKey(privatePem)).toString('base64url')
}
