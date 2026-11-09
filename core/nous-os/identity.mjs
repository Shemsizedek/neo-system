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
export function createIdentityVerifier({ publicKeyPem, issuer, audience, now = () => Date.now() } = {}) {
  let key;
  try {
    if (publicKeyPem && issuer && audience) {
      key = createPublicKey(publicKeyPem);
      if (key.asymmetricKeyType !== 'ed25519') key = undefined;
    }
  } catch { key = undefined; }

  const configured = Boolean(key && issuer && audience);
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
      const valid = verify(null, Buffer.from(protectedPart + '.' + payloadPart), key, Buffer.from(signaturePart, 'base64url'));
      if (!valid) throw new IdentityError('invalid_signature');
      const epoch = Math.floor(now() / 1000);
      if (claims?.iss !== issuer || !(claims.aud === audience || (Array.isArray(claims.aud) && claims.aud.includes(audience)))) throw new IdentityError('invalid_claims');
      if (typeof claims.sub !== 'string' || !claims.sub.trim() || !Number.isSafeInteger(claims.exp) || claims.exp <= epoch) throw new IdentityError('invalid_claims');
      if (claims.nbf !== undefined && (!Number.isSafeInteger(claims.nbf) || claims.nbf > epoch)) throw new IdentityError('invalid_claims');
      if (claims.iat !== undefined && (!Number.isSafeInteger(claims.iat) || claims.iat > epoch + 60)) throw new IdentityError('invalid_claims');
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
  return createIdentityVerifier({ publicKeyPem, issuer: env.NOUS_IDENTITY_ISSUER, audience: env.NOUS_IDENTITY_AUDIENCE });
}
