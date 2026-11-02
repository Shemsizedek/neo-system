// Server-side CES ownership challenge verification. Source account control MUST
// be independently checked by the trusted CES attestation service before signing.
// A generic administrator-login proof must never satisfy this contract.
import {randomBytes,createHash,createPublicKey,KeyObject,verify as verifySignature} from 'node:crypto';

const audience='neo-bank-ces-account-link/v1';
const issuer='neo-ces-account-attestor';
const lifetimeMs=3*60*1000;
const maxClockSkewMs=30*1000;
const sha256=value=>createHash('sha256').update(value).digest('hex');
const subjectPattern=/^[A-Za-z0-9:._-]{6,160}$/;
const accountPattern=/^[A-Z0-9][A-Z0-9._-]{2,79}$/;
const noncePattern=/^[A-Za-z0-9_-]{43}$/;
const timestamp=value=>typeof value==='string'&&Number.isFinite(Date.parse(value))?Date.parse(value):NaN;
const canonical=attestation=>[
  'neo-ces-account-control/v1',
  attestation.issuer,
  attestation.audience,
  attestation.neoSubject,
  attestation.exchangeId,
  attestation.externalAccount,
  attestation.challenge,
  attestation.proofType,
  attestation.issuedAt,
  attestation.expiresAt
].join('\n');

function validPending(value) {
  return value?.status==='pending_external_verification' &&
    subjectPattern.test(value.neoSubject||'') &&
    /^[A-Z0-9]{3,12}$/.test(value.exchangeId||'') &&
    accountPattern.test(value.externalAccount||'');
}

function validatePublicKey(value) {
  try {
    const key=value instanceof KeyObject && value.type==='public' ? value : createPublicKey(value);
    if(key.type!=='public'||key.asymmetricKeyType!=='ed25519')throw Error('wrong_key_type');
    return key;
  }catch{throw new Error('trusted_ces_public_key_required')}
}

export async function issueCesOwnershipChallenge(
  pending,{authenticatedNeoSubject,challengeStore,now=()=>Date.now(),random=randomBytes}={}
) {
  if(!validPending(pending) || authenticatedNeoSubject!==pending.neoSubject){
    throw new Error('neo_identity_authentication_required');
  }
  if(typeof challengeStore?.put!=='function')throw new Error('durable_challenge_store_required');
  const nowMs=now();
  if(!Number.isFinite(nowMs))throw new Error('invalid_server_clock');
  const nonce=random(32);
  if(!Buffer.isBuffer(nonce)||nonce.length!==32)throw new Error('secure_nonce_required');
  const challenge=nonce.toString('base64url');
  const expiresAt=new Date(nowMs+lifetimeMs).toISOString();
  await challengeStore.put({
    challengeHash:sha256(challenge),
    neoSubject:pending.neoSubject,
    exchangeId:pending.exchangeId,
    externalAccount:pending.externalAccount,
    expiresAt
  });
  return Object.freeze({
    audience,neoSubject:pending.neoSubject,exchangeId:pending.exchangeId,
    externalAccount:pending.externalAccount,challenge,expiresAt
  });
}

export function createCesOwnershipVerifier({
  cesPublicKey,challengeStore,now=()=>Date.now()
}={}) {
  if(typeof challengeStore?.consume!=='function')throw new Error('durable_challenge_store_required');
  // Parse trusted key at configuration time; do not silently fall back.
  const publicKey=validatePublicKey(cesPublicKey);
  return async ({neoSubject,exchangeId,externalAccount,evidence}={})=>{
    const att=evidence?.attestation;
    const signature=evidence?.signature;
    const nowMs=now();
    if(!Number.isFinite(nowMs) ||
      !subjectPattern.test(neoSubject||'') ||
      !/^[A-Z0-9]{3,12}$/.test(exchangeId||'') ||
      !accountPattern.test(externalAccount||'') ||
      !att||typeof att!=='object'||Array.isArray(att)||
      att.issuer!==issuer||att.audience!==audience||
      att.proofType!=='specific-account-control-verified'||
      att.neoSubject!==neoSubject||att.exchangeId!==exchangeId||
      att.externalAccount!==externalAccount||
      !noncePattern.test(att.challenge||'')||
      typeof signature!=='string'||!/^[A-Za-z0-9_-]{86}$/.test(signature)) {
      throw new Error('ces_account_verification_failed');
    }
    const issuedAt=timestamp(att.issuedAt),expiresAt=timestamp(att.expiresAt);
    if(!Number.isFinite(issuedAt)||!Number.isFinite(expiresAt)||
      issuedAt>nowMs+maxClockSkewMs || nowMs>=expiresAt ||
      nowMs-issuedAt>lifetimeMs || expiresAt-issuedAt>lifetimeMs ||
      expiresAt<=issuedAt)throw new Error('ces_account_proof_expired');
    const raw=Buffer.from(signature,'base64url');
    if(raw.length!==64||
      !verifySignature(null,Buffer.from(canonical(att),'utf8'),publicKey,raw)){
      throw new Error('ces_account_verification_failed');
    }
    // Must atomically delete a matching unexpired challenge; a replay must fail.
    const consumed=await challengeStore.consume({
      challengeHash:sha256(att.challenge),
      neoSubject,exchangeId,externalAccount,now:new Date(nowMs).toISOString()
    });
    if(consumed!==true)throw new Error('ces_account_challenge_used_or_expired');
    return {
      verified:true,neoSubject,exchangeId,externalAccount,
      verifiedAt:new Date(issuedAt).toISOString()
    };
  };
}

export const CES_ACCOUNT_PROOF_AUDIENCE=audience;
