import { createPublicKey } from 'node:crypto';
import { verifyRegistrationResponse } from '@simplewebauthn/server';
import { convertCOSEtoPKCS } from '@simplewebauthn/server/helpers';

// Inactive Gate 4 integration; no HTTP routes or account issuance.
// This module never accepts an untrusted "verified: true" flag as proof.
export function createVerifiedRegistrationAdapter() {
  return async function verifyNEOKeyRegistration({
    response, expectedChallenge, expectedOrigin, expectedRPID,
    requireUserVerification
  } = {}) {
    if (requireUserVerification !== true ||
        !/^[a-zA-Z0-9_-]{43}$/.test(expectedChallenge ?? '') ||
        typeof expectedRPID !== 'string' ||
        expectedOrigin !== `https://${expectedRPID}` ||
        !response || typeof response !== 'object' ||
        response.type !== 'public-key') {
      return null;
    }
    try {
      // The library validates client data, CBOR and RP/origin constraints.
      const verified = await verifyRegistrationResponse({
        response,
        expectedChallenge,
        expectedOrigin,
        expectedRPID,
        requireUserPresence:true,
        requireUserVerification:true,
        supportedAlgorithmIDs:[-7]
      });
      const info = verified?.registrationInfo;
      const cred = info?.credential;
      if (!verified.verified || info.userVerified !== true ||
          !cred || !/^[a-zA-Z0-9_-]{8,1024}$/.test(cred.id) ||
          cred.id !== response.id ||
          !Number.isSafeInteger(cred.counter) || cred.counter < 0 ||
          !(cred.publicKey instanceof Uint8Array) || cred.publicKey.length > 8192) {
        return null;
      }
      const der = convertCOSEtoPKCS(cred.publicKey);
      const key = createPublicKey({key:Buffer.from(der),format:'der',type:'spki'});
      if (key.asymmetricKeyType !== 'ec' ||
          key.asymmetricKeyDetails?.namedCurve !== 'prime256v1') return null;
      return Object.freeze({
        verified:true, userVerified:true, credentialId:cred.id,
        publicKeyPem:key.export({type:'spki',format:'pem'}),
        signCount:cred.counter, algorithm:-7
      });
    } catch { return null; }
  };
}
