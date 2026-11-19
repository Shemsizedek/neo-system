import { createHash, randomBytes, createPublicKey } from 'node:crypto';

// Gate 3: server-only composition. No route, token issuer, recovery override,
// device-control authorization or live hardware attestation is included.
const hash = value => createHash('sha256').update(value).digest('hex');
const validSubject = value => typeof value === 'string' && value.length > 0 && value.length <= 256;
const validId = value => typeof value === 'string' && /^[A-Za-z0-9_-]{8,1024}$/.test(value);
const validChallenge = value => typeof value === 'string' && /^[A-Za-z0-9_-]{43}$/.test(value);

export function createNeoKeyLifecycle({
  rpId, origin, store, resolveSessionSubject, authorizeEnrollment,
  verifyRegistrationResponse, verifyExistingAssertion,
  now = () => Date.now(), ttlMs = 120_000
} = {}) {
  if (typeof rpId !== 'string' || !/^[a-z0-9.-]+$/.test(rpId) ||
      origin !== `https://${rpId}` ||
      !Number.isSafeInteger(ttlMs) || ttlMs < 10_000 || ttlMs > 300_000 ||
      [resolveSessionSubject, authorizeEnrollment, verifyRegistrationResponse,
        verifyExistingAssertion].some(v => typeof v !== 'function') ||
      ['getOrCreateUserHandle', 'insertRegistrationChallenge', 'registerAtomic',
        'revokeAtomic'].some(name => typeof store?.[name] !== 'function')) {
    throw new Error('neo_key_lifecycle_configuration_required');
  }
  const subjectFrom = async session => {
    const subject = await resolveSessionSubject(session);
    if (!validSubject(subject)) throw new Error('neopass_session_required');
    return subject;
  };
  return Object.freeze({
    async beginRegistration({session} = {}) {
      const subject = await subjectFrom(session);
      // This must be a trusted, server-side step-up / operator bootstrap
      // approval. An HTTP payload flag is NOT sufficient authorization.
      const decision = await authorizeEnrollment({subject, session});
      if (!decision || decision.allowed !== true ||
          !['verified-existing-passkey', 'verified-operator-bootstrap'].includes(decision.method) ||
          !validId(decision.authorizationRef)) {
        throw new Error('neo_key_enrollment_authorization_required');
      }
      const userHandle = await store.getOrCreateUserHandle(subject, randomBytes(32).toString('base64url'));
      if (!validChallenge(userHandle)) throw new Error('neo_key_user_handle_unavailable');
      const challenge = randomBytes(32).toString('base64url');
      const expiresAt = now() + ttlMs;
      await store.insertRegistrationChallenge({
        challengeHash: hash(challenge), subject, rpId, origin, expiresAt,
        method: decision.method, authorizationRef: decision.authorizationRef
      });
      return Object.freeze({
        publicKey: {
          challenge, rp: {id: rpId, name: 'NEO Key'},
          user: {id: userHandle, name: 'NEO Member', displayName: 'NEO Member'},
          pubKeyCredParams: [{type:'public-key',alg:-7}],
          authenticatorSelection: {userVerification:'required', residentKey:'preferred'},
          attestation: 'none', timeout: ttlMs
        }, expiresAt
      });
    },
    async finishRegistration({session, challenge, response} = {}) {
      const subject = await subjectFrom(session);
      if (!validChallenge(challenge) || !response || typeof response !== 'object') {
        throw new Error('neo_key_invalid_registration_response');
      }
      // MUST be supplied by an independently reviewed WebAuthn library,
      // never from request JSON, an HTTP boolean, or a mocked verifier.
      const proof = await verifyRegistrationResponse({
        response, expectedChallenge: challenge, expectedOrigin: origin,
        expectedRPID: rpId, requireUserVerification: true
      });
      if (!proof || proof.verified !== true || proof.userVerified !== true ||
          !validId(proof.credentialId) || typeof proof.publicKeyPem !== 'string' ||
          !proof.publicKeyPem.startsWith('-----BEGIN PUBLIC KEY-----') ||
          proof.publicKeyPem.length > 8192 ||
          !Number.isSafeInteger(proof.signCount) || proof.signCount < 0 ||
          proof.algorithm !== -7) {
        throw new Error('neo_key_registration_verification_failed');
      }
      // Validate importability and the advertised ES256 key curve even when
      // a trusted verification adapter supplies the public-key material.
      let parsedKey;
      try { parsedKey = createPublicKey(proof.publicKeyPem); }
      catch { throw new Error('neo_key_registration_verification_failed'); }
      if (parsedKey.asymmetricKeyType !== 'ec' ||
          parsedKey.asymmetricKeyDetails?.namedCurve !== 'prime256v1') {
        throw new Error('neo_key_registration_verification_failed');
      }
      const saved = await store.registerAtomic({
        challengeHash: hash(challenge), subject, rpId, origin, now: now(),
        credentialId: proof.credentialId, publicKeyPem: proof.publicKeyPem,
        signCount: proof.signCount
      });
      if (!saved) throw new Error('neo_key_registration_rejected');
      return Object.freeze({registered: true, credentialId: proof.credentialId,
        permissionGranted: false});
    },
    async revokeLostCredential({session, targetCredentialId, backupAssertion} = {}) {
      const subject = await subjectFrom(session);
      if (!validId(targetCredentialId) || !backupAssertion) {
        throw new Error('neo_key_recovery_requires_backup');
      }
      // The trusted verifier MUST consume a new one-use authenticate challenge.
      // The backup key cannot be the key being revoked.
      const proof = await verifyExistingAssertion(backupAssertion);
      // Trusted verifier must attest a fresh consumed assertion and scope;
      // browser-supplied metadata is never sufficient.
      if (proof?.subject !== subject || !validId(proof?.credentialId) ||
          proof.credentialId === targetCredentialId ||
          proof.assurance !== 'webauthn-verified' ||
          proof.rpId !== rpId || proof.origin !== origin ||
          proof.purpose !== 'authenticate' ||
          !Number.isSafeInteger(proof.verifiedAt) ||
          proof.verifiedAt > now() || now() - proof.verifiedAt > 60_000) {
        throw new Error('neo_key_recovery_requires_backup');
      }
      const revoked = await store.revokeAtomic({subject, rpId,
        targetCredentialId, backupCredentialId:proof.credentialId, now: now()});
      if (!revoked) throw new Error('neo_key_recovery_rejected');
      return Object.freeze({revoked:true, credentialId:targetCredentialId,
        permissionGranted:false});
    }
  });
}
