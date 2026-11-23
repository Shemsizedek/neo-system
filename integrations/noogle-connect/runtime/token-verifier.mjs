import { jwtVerify } from 'jose';

// Resource-server verifier only. Login, PKCE, discovery, client registration,
// token issuance and revocation storage belong to the verified OAuth provider.
export function createTokenVerifier({ issuer, audience, keySet, isRevoked, now = () => new Date() }) {
  for (const value of [issuer, audience]) {
    const url = new URL(value);
    if (url.protocol !== 'https:' || url.username || url.password || url.hash || url.search) throw Error('https_identity_configuration_required');
  }
  if (typeof keySet !== 'function' || typeof isRevoked !== 'function') throw Error('trusted_keys_and_revocation_required');
  return async token => {
    const { payload } = await jwtVerify(token, keySet, {
      issuer, audience, algorithms: ['ES256', 'RS256'],
      requiredClaims: ['sub', 'exp', 'iat', 'jti'], maxTokenAge: '5m',
      currentDate: now(), clockTolerance: 0
    });
    if (typeof payload.sub !== 'string' || !payload.sub.trim() || typeof payload.jti !== 'string' || !payload.jti ||
        typeof payload.scope !== 'string' || payload.exp - payload.iat > 300) throw Error('invalid_access_token');
    if (await isRevoked({ subject: payload.sub, tokenId: payload.jti }) !== false) throw Error('token_revoked_or_unverified');
    return { subject: payload.sub, scopes: payload.scope.split(/\s+/).filter(Boolean) };
  };
}
