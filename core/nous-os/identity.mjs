import { createPublicKey, verify } from 'node:crypto';

export class IdentityError extends Error {
  constructor(code, status = 401) { super(code); this.code = code; this.status = status; }
}

const decode = (part) => {
  if (!/^[a-zA-Z0-9_-]+$/.test(part)) throw new IdentityError('invalid_token');
  try { return JSON.parse(Buffer.from(part, 'base64url').toString('utf8')); }
  catch { throw new IdentityError('invalid_token'); }
};

/** Signature-only trust: callers cannot establish identity using unsigned headers. */
export function createIdentityVerifier({ publicKeyPem, verificationKeys, revokedKeyIds = [], issuer, audience, tokenUse, maxLifetimeSeconds, now = () => Date.now() } = {}) {
  let key;
  try {
    if (publicKeyPem && issuer && audience) {
      key = createPublicKey(publicKeyPem);
      if (key.asymmetricKeyType !== 'ed25519') key = undefined;
    }
  } catch { key = undefined; }

  // Explicit keyrings replace, never silently fall back to, the legacy key.
  let keyring = null;
  let ringValid = false;
  if (verificationKeys !== undefined) {
    try {
      if (!Array.isArray(verificationKeys) || !verificationKeys.length || verificationKeys.length > 8 ||
          !Array.isArray(revokedKeyIds) || !revokedKeyIds.every(id => typeof id === 'string')) throw new Error('invalid_keyring');
      const keys = new Map();
      for (const record of verificationKeys) {
        if (!record || typeof record.kid !== 'string' || !/^[a-zA-Z0-9._-]{1,64}$/.test(record.kid) ||
            typeof record.publicKeyPem !== 'string' || keys.has(record.kid)) throw new Error('invalid_keyring');
        const parsed = createPublicKey(record.publicKeyPem);
        if (parsed.asymmetricKeyType !== 'ed25519') throw new Error('invalid_keyring');
        keys.set(record.kid, parsed);
      }
      keyring = keys;
      ringValid = true;
    } catch { keyring = new Map(); ringValid = false; }
  }
  const revoked = new Set(revokedKeyIds);
  const configured = Boolean(issuer && audience && (verificationKeys === undefined ? key : ringValid));
  return {
    configured,
    verifyAuthorization(header) {
      if (!configured) throw new IdentityError('identity_not_configured', 503);
      if (typeof header !== 'string' || !/^Bearer [^ ]+$/.test(header)) throw new IdentityError('bearer_required');
      const token = header.slice(7);
      if (token.length > 8192) throw new IdentityError('invalid_token');
      const parts = token.split('.');
      if (parts.length !== 3) throw new IdentityError('invalid_token');
      const [protectedPart, payloadPart, signaturePart] = parts;
      const jwtHeader = decode(protectedPart);
      const claims = decode(payloadPart);
      if (jwtHeader?.alg !== 'EdDSA' || (jwtHeader.typ && jwtHeader.typ !== 'JWT')) throw new IdentityError('invalid_algorithm');
      if (!/^[a-zA-Z0-9_-]+$/.test(signaturePart)) throw new IdentityError('invalid_token');
      let verificationKey = key;
      if (verificationKeys !== undefined) {
        if (typeof jwtHeader.kid !== 'string' || !/^[a-zA-Z0-9._-]{1,64}$/.test(jwtHeader.kid)) throw new IdentityError('key_id_required');
        if (revoked.has(jwtHeader.kid)) throw new IdentityError('key_revoked');
        verificationKey = keyring.get(jwtHeader.kid);
        if (!verificationKey) throw new IdentityError('unknown_key_id');
      }
      const valid = verify(null, Buffer.from(protectedPart + '.' + payloadPart), verificationKey, Buffer.from(signaturePart, 'base64url'));
      if (!valid) throw new IdentityError('invalid_signature');
      const epoch = Math.floor(now() / 1000);
      if (claims?.iss !== issuer || !(claims.aud === audience || (Array.isArray(claims.aud) && claims.aud.includes(audience)))) throw new IdentityError('invalid_claims');
      if (typeof claims.sub !== 'string' || !claims.sub.trim() || !Number.isSafeInteger(claims.exp) || claims.exp <= epoch) throw new IdentityError('invalid_claims');
      if (claims.nbf !== undefined && (!Number.isSafeInteger(claims.nbf) || claims.nbf > epoch)) throw new IdentityError('invalid_claims');
      if (claims.iat !== undefined && (!Number.isSafeInteger(claims.iat) || claims.iat > epoch + 60)) throw new IdentityError('invalid_claims');
      if (tokenUse && claims.token_use !== tokenUse) throw new IdentityError('invalid_token_use');
      if (maxLifetimeSeconds !== undefined && (
        !Number.isSafeInteger(maxLifetimeSeconds) || maxLifetimeSeconds <= 0 ||
        !Number.isSafeInteger(claims.iat) ||
        claims.exp <= claims.iat ||
        claims.exp - claims.iat > maxLifetimeSeconds
      )) throw new IdentityError('invalid_token_lifetime');
      const scopes = Array.isArray(claims.scopes) ? claims.scopes : (typeof claims.scope === 'string' ? claims.scope.split(/\s+/) : []);
      if (!scopes.every(scope => typeof scope === 'string' && scope.length <= 128)) throw new IdentityError('invalid_claims');
      return Object.freeze({ subject: claims.sub, scopes: new Set(scopes), issuer });
    },
  };
}

export function identityFromEnv(env = process.env) {
  let publicKeyPem;
  try { if (env.NOUS_IDENTITY_PUBLIC_KEY_PEM_BASE64) publicKeyPem = Buffer.from(env.NOUS_IDENTITY_PUBLIC_KEY_PEM_BASE64, 'base64').toString('utf8'); }
  catch { /* Fail closed */ }
  const ringEnabled = Boolean(env.NOUS_IDENTITY_KEYRING_JSON_BASE64);
  let verificationKeys;
  if (ringEnabled) {
    try {
      const ring = JSON.parse(Buffer.from(env.NOUS_IDENTITY_KEYRING_JSON_BASE64, 'base64').toString('utf8'));
      if (!Array.isArray(ring)) throw new Error('invalid_ring');
      verificationKeys = ring;
    } catch { verificationKeys = []; } // Fail closed, never fall back.
  }
  const revokedKeyIds = String(env.NOUS_IDENTITY_REVOKED_KEY_IDS || '').split(',').map(value => value.trim()).filter(Boolean);
  return createIdentityVerifier({
    publicKeyPem, ...(ringEnabled ? { verificationKeys, revokedKeyIds } : {}),
    issuer: env.NOUS_IDENTITY_ISSUER, audience: env.NOUS_IDENTITY_AUDIENCE,
    tokenUse: 'nous-read', maxLifetimeSeconds: 120,
  });
}
