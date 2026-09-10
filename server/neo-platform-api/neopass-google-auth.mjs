import { createHmac, randomBytes, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';

const SESSION_COOKIE = 'neo_pass_session';
const scrypt = promisify(scryptCallback);

function encode(value) { return Buffer.from(JSON.stringify(value)).toString('base64url'); }

export function issueNeopassToken({ subject, secret, issuer = 'neo-pass', now = () => Date.now(), ttlSeconds = 60 * 60 * 8, claims = {} }) {
  if (!subject || !secret) throw new Error('neopass_token_configuration_required');
  const value = now();
  const issuedAt = Math.floor((typeof value === 'number' ? value : Date.parse(value)) / 1000);
  const header = encode({ alg: 'HS256', typ: 'JWT' });
  const payload = encode({ ...claims, sub: subject, iss: issuer, iat: issuedAt, exp: issuedAt + ttlSeconds });
  const signature = createHmac('sha256', secret).update(`${header}.${payload}`).digest('base64url');
  return `${header}.${payload}.${signature}`;
}

export function sessionCookie(token, { maxAge = 60 * 60 * 8 } = {}) {
  return `${SESSION_COOKIE}=${token}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${maxAge}`;
}

export function clearSessionCookie() {
  return `${SESSION_COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`;
}

async function hashPassword(password) {
  if (typeof password !== 'string' || password.length < 12 || password.length > 128) throw new Error('password_requirements_not_met');
  const salt = randomBytes(16).toString('base64url');
  const derived = await scrypt(password, salt, 64);
  return `scrypt$${salt}$${Buffer.from(derived).toString('base64url')}`;
}

async function verifyPassword(password, encoded) {
  const [scheme, salt, expectedValue] = String(encoded || '').split('$');
  if (scheme !== 'scrypt' || !salt || !expectedValue || typeof password !== 'string') return false;
  const expected = Buffer.from(expectedValue, 'base64url');
  const actual = Buffer.from(await scrypt(password, salt, expected.length));
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

export function createGoogleNeopassAuth({ clientId, jwtSecret, jwtIssuer = 'neo-pass', registry, verifyGoogleCredential, executiveAdminEmail = process.env.NEO_EXECUTIVE_ADMIN_EMAIL, executiveAdminUsername = process.env.NEO_EXECUTIVE_ADMIN_USERNAME || 'Shemsizedek', now = () => Date.now() } = {}) {
  if (!clientId || !jwtSecret || !registry || !verifyGoogleCredential) return null;
  const executiveMember = subject => ({ subject, email: executiveAdminEmail, username: executiveAdminUsername, displayName: 'H.I.M Dr. Lawiy Zodok', neopassStatus: 'active', role: 'executive-admin', hasPassword: false, storageStatus: 'activation-pending' });
  return {
    clientId,
    async session(subject, sessionClaims = {}) {
      if (sessionClaims.role === 'executive-admin' && sessionClaims.email?.toLowerCase() === executiveAdminEmail?.toLowerCase()) return executiveMember(subject);
      let record;
      try { record = await registry.getNEOpassCredential(subject); }
      catch { return { subject, displayName: 'NEOpass Member', neopassStatus: 'pending', storageStatus: 'unavailable' }; }
      if (!record) return { subject, displayName: 'NEOpass Member', neopassStatus: 'pending' };
      return { subject, email: record.email, username: record.username, displayName: record.displayName, picture: record.picture, neopassStatus: record.status, role: record.role || 'member', hasPassword: Boolean(record.passwordHash) };
    },
    async login(credential) {
      let profile;
      try { profile = await verifyGoogleCredential(credential, clientId); }
      catch { const error = new Error('google_token_invalid'); error.code = 'google_token_invalid'; throw error; }
      if (!profile?.sub || !profile.email || profile.email_verified !== true) throw new Error('google_identity_not_verified');
      const subject = `google:${profile.sub}`;
      const isExecutive = executiveAdminEmail && profile.email.toLowerCase() === executiveAdminEmail.toLowerCase();
      let existing;
      try { existing = await registry.getNEOpassCredential(subject); }
      catch {
        try { existing = await registry.getNEOpassCredential(subject); }
        catch {
          if (isExecutive) {
            const claims = { role: 'executive-admin', email: profile.email };
            return { token: issueNeopassToken({ subject, secret: jwtSecret, issuer: jwtIssuer, now, claims }), member: executiveMember(subject) };
          }
          const error = new Error('neopass_registry_unavailable'); error.code = 'neopass_registry_unavailable'; throw error;
        }
      }
      const account = {
        subject,
        provider: 'google',
        providerSubject: profile.sub,
        email: profile.email,
        emailKey: profile.email.toLowerCase(),
        username: isExecutive ? executiveAdminUsername : existing?.username || null,
        usernameKey: isExecutive ? executiveAdminUsername.toLowerCase() : existing?.usernameKey || null,
        displayName: profile.name || profile.email,
        picture: profile.picture || null,
        status: isExecutive ? 'active' : existing?.status || 'pending',
        role: isExecutive ? 'executive-admin' : existing?.role || 'member',
        templeCitizenId: existing?.templeCitizenId || null,
        lastAuthenticatedAt: new Date(now()).toISOString()
      };
      let record;
      try { record = await registry.upsert('neopassCredentials', account, 'subject'); }
      catch {
        try { record = await registry.upsert('neopassCredentials', account, 'subject'); }
        catch {
          if (isExecutive) {
            const claims = { role: 'executive-admin', email: profile.email };
            return { token: issueNeopassToken({ subject, secret: jwtSecret, issuer: jwtIssuer, now, claims }), member: executiveMember(subject) };
          }
          const error = new Error('neopass_registry_unavailable'); error.code = 'neopass_registry_unavailable'; throw error;
        }
      }
      return {
        token: issueNeopassToken({ subject, secret: jwtSecret, issuer: jwtIssuer, now }),
        member: { subject, email: record.email, username: record.username, displayName: record.displayName, picture: record.picture, neopassStatus: record.status, role: record.role, hasPassword: Boolean(record.passwordHash) }
      };
    },
    async setExecutivePassword(subject, password) {
      const record = await registry.getNEOpassCredential(subject);
      if (!record || record.role !== 'executive-admin' || record.email?.toLowerCase() !== executiveAdminEmail?.toLowerCase()) throw new Error('executive_bootstrap_forbidden');
      const passwordHash = await hashPassword(password);
      const saved = await registry.upsert('neopassCredentials', { ...record, passwordHash, passwordUpdatedAt: new Date(now()).toISOString() }, 'subject');
      return { subject: saved.subject, username: saved.username, role: saved.role, hasPassword: true };
    },
    async passwordLogin(login, password) {
      const record = await registry.getNEOpassCredentialByLogin(login);
      if (!record || record.status !== 'active' || !await verifyPassword(password, record.passwordHash)) throw new Error('invalid_credentials');
      return {
        token: issueNeopassToken({ subject: record.subject, secret: jwtSecret, issuer: jwtIssuer, now }),
        member: { subject: record.subject, email: record.email, username: record.username, displayName: record.displayName, picture: record.picture, neopassStatus: record.status, role: record.role || 'member', hasPassword: true }
      };
    }
  };
}

export { SESSION_COOKIE };
