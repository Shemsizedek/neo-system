import { createHmac } from 'node:crypto';

const SESSION_COOKIE = 'neo_pass_session';

function encode(value) { return Buffer.from(JSON.stringify(value)).toString('base64url'); }

export function issueNeopassToken({ subject, secret, issuer = 'neo-pass', now = () => Date.now(), ttlSeconds = 60 * 60 * 8 }) {
  if (!subject || !secret) throw new Error('neopass_token_configuration_required');
  const value = now();
  const issuedAt = Math.floor((typeof value === 'number' ? value : Date.parse(value)) / 1000);
  const header = encode({ alg: 'HS256', typ: 'JWT' });
  const payload = encode({ sub: subject, iss: issuer, iat: issuedAt, exp: issuedAt + ttlSeconds });
  const signature = createHmac('sha256', secret).update(`${header}.${payload}`).digest('base64url');
  return `${header}.${payload}.${signature}`;
}

export function sessionCookie(token, { maxAge = 60 * 60 * 8 } = {}) {
  return `${SESSION_COOKIE}=${token}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${maxAge}`;
}

export function clearSessionCookie() {
  return `${SESSION_COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`;
}

export function createGoogleNeopassAuth({ clientId, jwtSecret, jwtIssuer = 'neo-pass', registry, verifyGoogleCredential, now = () => Date.now() } = {}) {
  if (!clientId || !jwtSecret || !registry || !verifyGoogleCredential) return null;
  return {
    clientId,
    async session(subject) {
      const record = await registry.getNEOpassCredential(subject);
      if (!record) return { subject, displayName: 'NEOpass Member', neopassStatus: 'pending' };
      return { subject, email: record.email, displayName: record.displayName, picture: record.picture, neopassStatus: record.status };
    },
    async login(credential) {
      const profile = await verifyGoogleCredential(credential, clientId);
      if (!profile?.sub || !profile.email || profile.email_verified !== true) throw new Error('google_identity_not_verified');
      const subject = `google:${profile.sub}`;
      const existing = await registry.getNEOpassCredential(subject);
      const record = await registry.upsert('neopassCredentials', {
        subject,
        provider: 'google',
        providerSubject: profile.sub,
        email: profile.email,
        displayName: profile.name || profile.email,
        picture: profile.picture || null,
        status: existing?.status || 'pending',
        templeCitizenId: existing?.templeCitizenId || null,
        lastAuthenticatedAt: new Date(now()).toISOString()
      }, 'subject');
      return {
        token: issueNeopassToken({ subject, secret: jwtSecret, issuer: jwtIssuer, now }),
        member: { subject, email: record.email, displayName: record.displayName, picture: record.picture, neopassStatus: record.status }
      };
    }
  };
}

export { SESSION_COOKIE };
