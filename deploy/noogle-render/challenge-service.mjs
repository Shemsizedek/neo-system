import { randomBytes, createHash } from 'node:crypto';

// Inactive one-time challenge contract for Noogle Connect. Never trust a
// caller-provided subject: the subject must come from verified NEO Pass.
const hash = value => createHash('sha256').update(value).digest('hex');
const purposes = new Set(['register','authenticate']);
export function createChallengeService({store,now=()=>Date.now(),ttlMs=120_000}) {
 if(!store || typeof store.insert!=='function' || typeof store.consumeAtomic!=='function' ||
    !Number.isSafeInteger(ttlMs) || ttlMs<10_000 || ttlMs>300_000)throw Error('secure_challenge_store_required');
 return Object.freeze({
  async issue({subject,credentialId,purpose,rpId,origin}) {
   if(typeof subject!=='string'||!subject||subject.length>256||
      !purposes.has(purpose)||typeof rpId!=='string'||!rpId||
      typeof origin!=='string'||!origin.startsWith('https://')||
      (credentialId!==null && credentialId!==undefined && (typeof credentialId!=='string'||!credentialId)))
      throw Error('invalid_challenge_scope');
   if(purpose==='authenticate' && !credentialId)throw Error('credential_required');
   const challenge=randomBytes(32).toString('base64url');
   const expiresAt=now()+ttlMs;
   await store.insert({challengeHash:hash(challenge),subject,credentialId:credentialId||null,purpose,rpId,origin,expiresAt});
   return {challenge,expiresAt,purpose,rpId,origin};
  },
  async consume({challenge,subject,credentialId,purpose,rpId,origin}) {
   if(typeof challenge!=='string' || !/^[a-zA-Z0-9_-]{43}$/.test(challenge)||
     typeof subject!=='string'||!subject||!purposes.has(purpose)||
     typeof rpId!=='string'||typeof origin!=='string')return false;
   return Boolean(await store.consumeAtomic({
    challengeHash:hash(challenge),subject,credentialId:credentialId||null,purpose,rpId,origin,now:now()
   }));
  }
 });
}
