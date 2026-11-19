import {createHash, randomBytes} from 'node:crypto';
import {verifyAuthenticationResponse} from '@simplewebauthn/server';

// Inactive WebAuthn assertion verifier for registration-backed COSE credentials.
// This layer does not issue sessions, access rights, or recovery permissions.
const digest = value => createHash('sha256').update(value).digest('hex');
const challengePattern = /^[A-Za-z0-9_-]{43}$/;
const credentialPattern = /^[A-Za-z0-9_-]{8,1024}$/;

export function createNeoKeyAssertionService({
  rpId, origin, store, resolveSessionSubject,
  now = () => Date.now(), ttlMs = 120_000
} = {}) {
  if (typeof rpId !== 'string' || !/^[a-z0-9.-]+$/.test(rpId) ||
      origin !== `https://${rpId}` ||
      !Number.isSafeInteger(ttlMs) || ttlMs < 10_000 || ttlMs > 300_000 ||
      typeof resolveSessionSubject !== 'function' ||
      ['getActiveCredential','insertAuthenticationChallenge',
       'getPendingAuthenticationChallenge','confirmAuthenticationAtomic'].some(k=>typeof store?.[k]!=='function')) {
    throw new Error('neo_key_assertion_configuration_required');
  }
  const active = async credentialId => {
    const row = await store.getActiveCredential(credentialId);
    if (!row || row.revokedAt != null || row.rpId !== rpId ||
        typeof row.subject !== 'string' || !row.subject ||
        !Number.isSafeInteger(row.signCount) || row.signCount < 0 ||
        typeof row.publicKeyCose !== 'string' ||
        !/^[A-Za-z0-9_-]{48,11000}$/.test(row.publicKeyCose)) return null;
    return row;
  };
  return Object.freeze({
    async begin({session,credentialId}={}) {
      const subject = await resolveSessionSubject(session);
      if(typeof subject!=='string'||!subject||subject.length>256||
         !credentialPattern.test(credentialId??'')) return null;
      const row = await active(credentialId);
      if(!row || row.subject!==subject)return null;
      const challenge = randomBytes(32).toString('base64url');
      const expiresAt = now()+ttlMs;
      await store.insertAuthenticationChallenge({
        challengeHash:digest(challenge),subject,credentialId,rpId,origin,expiresAt
      });
      return Object.freeze({
        publicKey:{
          challenge, rpId, allowCredentials:[{id:credentialId,type:'public-key'}],
          userVerification:'required', timeout:ttlMs
        },expiresAt
      });
    },
    // The WebAuthn library checks the signature against the stored COSE key.
    // Durable counter update and challenge consumption are one transaction.
    async verify({response}={}) {
      try {
        if (!response || typeof response!=='object' ||
            !credentialPattern.test(response.id??'') ||
            response.type!=='public-key' ||
            response.rawId!==response.id ||
            typeof response.response?.clientDataJSON!=='string' ||
            response.response.clientDataJSON.length>16384) return null;
        const raw = Buffer.from(response.response.clientDataJSON,'base64url');
        if(raw.length>8192)return null;
        const client = JSON.parse(raw.toString('utf8'));
        if(client.type!=='webauthn.get'||client.crossOrigin===true||
           !challengePattern.test(client.challenge??''))return null;
        const row = await active(response.id);
        if(!row)return null;
        const scope={challengeHash:digest(client.challenge),subject:row.subject,
          credentialId:response.id,rpId,origin,now:now()};
        if(!await store.getPendingAuthenticationChallenge(scope))return null;
        const verified=await verifyAuthenticationResponse({
          response,expectedChallenge:client.challenge,
          expectedOrigin:origin,expectedRPID:rpId,
          requireUserVerification:true,credential:{
            id:response.id,publicKey:Buffer.from(row.publicKeyCose,'base64url'),
            counter:row.signCount
          }
        });
        const info=verified?.authenticationInfo;
        if(verified?.verified!==true||info?.userVerified!==true||
            info?.credentialID!==response.id||info.origin!==origin||info.rpID!==rpId||
            !Number.isSafeInteger(info.newCounter)||info.newCounter<0)return null;
        if(!await store.confirmAuthenticationAtomic({
          ...scope,now:now(),newCounter:info.newCounter
        }))return null;
        return Object.freeze({
          assurance:'webauthn-verified',subject:row.subject,credentialId:response.id,
          rpId,origin,purpose:'authenticate',verifiedAt:now()
        });
      }catch{return null;}
    }
  });
}
