import { createHmac, randomBytes, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';

const SESSION_COOKIE = 'neo_pass_session';
const BROWSER_TOKEN_TTL_SECONDS = 5 * 60;
const CROWN_ATTESTATION_TTL_SECONDS = 5 * 60;
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

export function verifyNeopassToken(token, { secret, issuer = 'neo-pass', now = () => Date.now() } = {}) {
  if (!secret || !token) return null;
  const parts = String(token).split('.');
  if (parts.length !== 3) return null;
  try {
    const header = JSON.parse(Buffer.from(parts[0], 'base64url').toString('utf8'));
    const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'));
    const value = now();
    const nowSeconds = Math.floor((typeof value === 'number' ? value : Date.parse(value)) / 1000);
    if (header.alg !== 'HS256' || header.typ !== 'JWT' || !payload.sub ||
        (payload.exp && Number(payload.exp) <= nowSeconds) || (issuer && payload.iss !== issuer)) return null;
    const expected = createHmac('sha256', secret).update(`${parts[0]}.${parts[1]}`).digest();
    const actual = Buffer.from(parts[2], 'base64url');
    if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) return null;
    return payload;
  } catch { return null; }
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
  const executiveMember = subject => ({ subject, email: executiveAdminEmail, username: executiveAdminUsername, displayName: 'H.I.M Dr. Lawiy Zodok', neopassStatus: 'active', role: 'executive-admin', crownOfficeSlot: 'CROWN-ROOT-A', hasPassword: false, storageStatus: 'activation-pending' });
  return {
    clientId,
    async session(subject, sessionClaims = {}) {
      if (sessionClaims.role === 'executive-admin' && sessionClaims.email?.toLowerCase() === executiveAdminEmail?.toLowerCase()) return executiveMember(subject);
      let record;
      try { record = await registry.getNEOpassCredential(subject); }
      catch { return { subject, displayName: 'NEOpass Member', neopassStatus: 'pending', storageStatus: 'unavailable' }; }
      if (!record) return { subject, displayName: 'NEOpass Member', neopassStatus: 'pending' };
      if (record.role === 'executive-admin' && record.email?.toLowerCase() === executiveAdminEmail?.toLowerCase()) return { ...executiveMember(subject), hasPassword: Boolean(record.passwordHash), storageStatus: undefined };
      return { subject, email: record.email, username: record.username, displayName: record.displayName, picture: record.picture, neopassStatus: record.status, role: record.role || 'member', crownOfficeSlot: record.crownOfficeSlot || null, hasPassword: Boolean(record.passwordHash) };
    },
    async crownAttestation(subject, requestedSlot, sessionClaims = {}) {
      if (!subject) throw new Error('neopass_identity_required');
      const member = await this.session(subject, sessionClaims);
      if (member.neopassStatus !== 'active' && member.role !== 'executive-admin') throw new Error('neopass_active_membership_required');
      const slot = String(requestedSlot || '').trim();
      if (!member.crownOfficeSlot || slot !== member.crownOfficeSlot) throw new Error('crown_office_authorization_required');
      const personId = `neopass:${createHmac('sha256', jwtSecret).update(subject).digest('hex').slice(0, 24)}`;
      const jti = randomBytes(18).toString('base64url');
      const token = issueNeopassToken({ subject, secret: jwtSecret, issuer: jwtIssuer, now,
        ttlSeconds: CROWN_ATTESTATION_TTL_SECONDS,
        claims: { scope: 'crown:root-enroll', token_use: 'crown-office-attestation', slot, person_id: personId, jti } });
      return { token, expiresIn: CROWN_ATTESTATION_TTL_SECONDS, slot, personId };
    },
    verifyCrownAttestation(token) {
      const claims = verifyNeopassToken(token, { secret: jwtSecret, issuer: jwtIssuer, now });
      if (!claims || claims.scope !== 'crown:root-enroll' || claims.token_use !== 'crown-office-attestation' ||
          !/^CROWN-ROOT-[ABC]$/.test(String(claims.slot || '')) || !claims.person_id || !claims.jti) return null;
      return { subject: claims.sub, slot: claims.slot, personId: claims.person_id, jti: claims.jti, expiresAt: claims.exp };
    },
    async browserToken(subject, sessionClaims = {}) {
      if (!subject) throw new Error('neopass_identity_required');
      const member = await this.session(subject, sessionClaims);
      if (member.neopassStatus !== 'active' && member.role !== 'executive-admin') {
        const error = new Error('neopass_active_membership_required');
        error.code = 'neopass_active_membership_required';
        throw error;
      }
      const current = now();
      const issuedAt = Math.floor((typeof current === 'number' ? current : Date.parse(current)) / 1000);
      const expiresAt = issuedAt + BROWSER_TOKEN_TTL_SECONDS;
      const token = issueNeopassToken({
        subject,
        secret: jwtSecret,
        issuer: jwtIssuer,
        now,
        ttlSeconds: BROWSER_TOKEN_TTL_SECONDS,
        claims: { scope: 'neo:oracle:execute', token_use: 'browser', role: member.role || 'member' }
      });
      return { token, expiresAt, member };
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

export { SESSION_COOKIE, BROWSER_TOKEN_TTL_SECONDS, CROWN_ATTESTATION_TTL_SECONDS };
