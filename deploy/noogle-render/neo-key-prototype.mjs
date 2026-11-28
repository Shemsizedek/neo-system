import { createChallengeService } from './challenge-service.mjs';
import { createAssertionVerifier } from './webauthn-assertion.mjs';

// Inactive composition prototype. No routes, sessions, credentials,
// wallet signatures, device enrollment or access grants are created here.
export function createNeoKeyPrototype({
  rpId, origin, challengeStore, getCredential, resolveSessionSubject,
  now, ttlMs
} = {}) {
  if (typeof rpId !== 'string' || !/^[a-z0-9.-]+$/.test(rpId) ||
      typeof origin !== 'string' || origin !== 'https://' + rpId ||
      typeof getCredential !== 'function' ||
      typeof resolveSessionSubject !== 'function') {
    throw new Error('neo_key_configuration_required');
  }
  const challenges = createChallengeService({store: challengeStore, now, ttlMs});
  const credentialFor = async id => {
    const credential = await getCredential(id);
    if (!credential || credential.revoked || credential.rpId !== rpId ||
        typeof credential.subject !== 'string' || !credential.subject ||
        typeof credential.confirmCounter !== 'function') return null;
    return credential;
  };
  const verifyAssertion = createAssertionVerifier({
    rpId, origin, getCredential: credentialFor,
    consumeChallenge: ({challenge, credentialId, subject}) =>
      challenges.consume({challenge, credentialId, subject,
        purpose:'authenticate', rpId, origin})
  });
  return Object.freeze({
    async issueAuthenticationChallenge({session, credentialId} = {}) {
      // Session authority must come from the trusted server, not browser JSON.
      const subject = await resolveSessionSubject(session);
      if (typeof subject !== 'string' || !subject ||
          typeof credentialId !== 'string' || !credentialId) return null;
      const credential = await credentialFor(credentialId);
      if (!credential || credential.subject !== subject) return null;
      return challenges.issue({subject, credentialId, purpose:'authenticate', rpId, origin});
    },
    // Proof only; not an application session, device enrollment or API token.
    verifyAssertion
  });
}
