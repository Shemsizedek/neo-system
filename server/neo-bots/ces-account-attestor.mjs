// CES-side Ed25519 attestor. The signer is strictly gated by server-side
// account-control evidence; a CES login or admin role is not account ownership.
// Signing keys belong in protected runtime secrets, never in Git or browser data.
import {createPrivateKey,createPublicKey,KeyObject,sign as edSign} from 'node:crypto';

const AUDIENCE='neo-bank-ces-account-link/v1';
const ISSUER='neo-ces-account-attestor';
const LIFETIME=3*60*1000;
const CLOCK_SKEW=30*1000;
const SUBJECT=/^[A-Za-z0-9:._-]{6,160}$/;
const EXCHANGE=/^[A-Z0-9]{3,12}$/;
const ACCOUNT=/^[A-Z0-9][A-Z0-9._-]{2,79}$/;
const NONCE=/^[A-Za-z0-9_-]{43}$/;
const SUPPORTED=Object.freeze({NMNI:'NMNIBANK',XCPC:'XCPCBANK'});

export function canonicalCesAccountAttestation(value) {
  return [
    'neo-ces-account-control/v1',value.issuer,value.audience,value.neoSubject,
    value.exchangeId,value.externalAccount,value.challenge,value.proofType,
    value.issuedAt,value.expiresAt
  ].join('\n');
}

function requireSigningKey(input) {
  try {
    const key=input instanceof KeyObject && input.type==='private'
      ? input:createPrivateKey(input);
    if(key.type!=='private'||key.asymmetricKeyType!=='ed25519')throw Error('invalid');
    return key;
  }catch{throw new Error('ces_attestor_key_not_configured')}
}

function validChallenge(challenge,nowMs) {
  return challenge && typeof challenge==='object' && !Array.isArray(challenge) &&
    challenge.audience===AUDIENCE &&
    SUBJECT.test(challenge.neoSubject||'') &&
    EXCHANGE.test(challenge.exchangeId||'') &&
    ACCOUNT.test(challenge.externalAccount||'') &&
    SUPPORTED[challenge.exchangeId]===challenge.externalAccount &&
    NONCE.test(challenge.challenge||'') &&
    Number.isFinite(Date.parse(challenge.expiresAt||'')) &&
    Date.parse(challenge.expiresAt)>nowMs &&
    Date.parse(challenge.expiresAt)<=nowMs+LIFETIME+CLOCK_SKEW;
}

// accountControlVerifier is a SERVER-OWNED integration, not supplied by the
// browser or the HTTP request. It must independently inspect an authorized CES
// protected account record and check delegated control by the NEO principal.
// No default verifier: fail closed until a reviewed upstream route exists.
export function createCesAccountControlAttestor({
  signingKey,accountControlVerifier,now=()=>Date.now()
}={}){
  const privateKey=requireSigningKey(signingKey);
  if(typeof accountControlVerifier!=='function')
    throw new Error('ces_account_control_verifier_not_configured');
  const publicKey=createPublicKey(privateKey);
  return {
    publicKeyPem:publicKey.export({type:'spki',format:'pem'}),
    async attest(challenge){
      const at=now();
      if(!Number.isFinite(at)||!validChallenge(challenge,at))
        throw new Error('invalid_ces_account_challenge');

      // Untrusted input must never be upgraded into ownership evidence.
      // The verifier obtains its own proof from a protected CES session.
      const result=await accountControlVerifier(Object.freeze({
        neoSubject:challenge.neoSubject,
        exchangeId:challenge.exchangeId,
        externalAccount:challenge.externalAccount,
        challenge:challenge.challenge
      }));
      const observed=Date.parse(result?.observedAt||'');
      if(result?.verified!==true ||
        result?.source!=='ces_protected_account_record' ||
        result?.accountControlVerified!==true ||
        result?.principalBindingVerified!==true ||
        result?.neoSubject!==challenge.neoSubject ||
        result?.exchangeId!==challenge.exchangeId ||
        result?.externalAccount!==challenge.externalAccount ||
        !Number.isFinite(observed) || observed>at+CLOCK_SKEW ||
        at-observed>60*1000)
        throw new Error('ces_account_control_not_verified');

      const issuedAt=new Date(at).toISOString();
      const expiresAt=new Date(Math.min(at+LIFETIME,Date.parse(challenge.expiresAt))).toISOString();
      const attestation={
        issuer:ISSUER,audience:AUDIENCE,
        neoSubject:challenge.neoSubject,exchangeId:challenge.exchangeId,
        externalAccount:challenge.externalAccount,
        challenge:challenge.challenge,
        proofType:'specific-account-control-verified',issuedAt,expiresAt
      };
      return Object.freeze({
        attestation,
        signature:edSign(null,Buffer.from(canonicalCesAccountAttestation(attestation)),privateKey).toString('base64url')
      });
    }
  };
}

export function cesAccountAttestorReadiness(env=process.env) {
  return Object.freeze({
    signingKeyConfigured:Boolean(env.NEO_CES_ATTESTOR_PRIVATE_KEY_PEM),
    accountVerifierConfigured:false, // Must be explicitly provided by an approved runtime integration.
    enabled:false,
    supportedExchangeIds:Object.keys(SUPPORTED),
    financialWritesEnabled:false
  });
}
