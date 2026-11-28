import { createPublicKey, createHash, verify, randomBytes } from 'node:crypto';
export function enrollmentChallenge(agentId) {
  if (typeof agentId !== 'string' || !agentId.length || agentId.length > 512) throw new TypeError('invalid agent');
  return {agentId, nonce:randomBytes(32).toString('hex'), expiresAt:Date.now()+300000};
}
// Caller must load challenge from trusted storage, authenticate administrator,
// and atomically consume nonce and insert key in one database transaction.
export function validateEnrollment(challenge, spki, signature, now=Date.now()) {
  try {
    if (!challenge || typeof challenge.agentId !== 'string' || !challenge.agentId.length || challenge.agentId.length>512 || !/^[a-f0-9]{64}$/.test(challenge.nonce) || !Number.isSafeInteger(challenge.expiresAt) || challenge.expiresAt<=now || challenge.expiresAt>now+300000 || !Buffer.isBuffer(spki) || spki.length>512 || !Buffer.isBuffer(signature) || signature.length>128) return false;
    const key=createPublicKey({key:spki,format:'der',type:'spki'});
    if(key.asymmetricKeyType!=='ec'||key.asymmetricKeyDetails?.namedCurve!=='prime256v1'||!key.export({format:'der',type:'spki'}).equals(spki)) return false;
    const keyId=createHash('sha256').update(spki).digest('hex');
    const message=Buffer.from(JSON.stringify(['NEO-ENROLL-v1',challenge.agentId,challenge.nonce,challenge.expiresAt,keyId]));
    return verify('sha256',message,key,signature)?{agentId:challenge.agentId,keyId}:false;
  } catch {return false;}
}
