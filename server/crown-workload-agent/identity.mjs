import {createPrivateKey,createPublicKey,sign} from 'node:crypto'

export function workloadIdentity(privatePem,serviceId,keyId){
  const privateKey=createPrivateKey(privatePem)
  const jwk=createPublicKey(privateKey).export({format:'jwk'})
  if(jwk.kty!=='OKP'||jwk.crv!=='Ed25519'||!jwk.x)throw new Error('workload key must be Ed25519')
  return{protocol:'CROWN/1',gate:'CROWN-031',service_id:serviceId,key_id:keyId,algorithm:'Ed25519',public_key:jwk.x,private_key_exposed:false}
}
export function signCrownInput(privatePem,signingInput){
  const bytes=Buffer.from(signingInput.replace(/-/g,'+').replace(/_/g,'/'),'base64')
  return sign(null,bytes,createPrivateKey(privatePem)).toString('base64url')
}
