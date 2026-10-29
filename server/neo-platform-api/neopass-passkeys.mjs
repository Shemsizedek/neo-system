import { randomBytes, randomUUID, createHash } from 'node:crypto';
import { generateRegistrationOptions, verifyRegistrationResponse, generateAuthenticationOptions, verifyAuthenticationResponse } from '@simplewebauthn/server';
import { issueNeopassToken, verifyNeopassToken } from './neopass-google-auth.mjs';

const hash = value => createHash('sha256').update(value).digest('hex');
const canonical = value => typeof value === 'string' && /^[A-Za-z0-9_-]+$/.test(value) && Buffer.from(value, 'base64url').toString('base64url') === value;
function directCeremony(response) {
  const client=JSON.parse(Buffer.from(response?.response?.clientDataJSON||'', 'base64url').toString());
  if(client.crossOrigin===true || client.topOrigin) throw Error('passkey_cross_origin_forbidden');
}
export function createPasskeyAuth({ store, secret, origin, rpID, now = Date.now, webauthn = { generateRegistrationOptions, verifyRegistrationResponse, generateAuthenticationOptions, verifyAuthenticationResponse } }) {
  const parsed = new URL(origin);
  // Exact host scope, never an RP domain shared with less-trusted subdomains.
  if (!store || typeof secret !== 'string' || secret.length < 32 || parsed.origin !== origin || parsed.hostname !== rpID || parsed.protocol !== 'https:') throw Error('neopass_passkey_configuration_required');
  const memberView = row => ({ subject: row.subject, username: row.username, displayName: row.display_name, role: row.role, neopassStatus: row.status, authentication: 'device-passkey' });
  const tokenFrom = req => String(req.headers.cookie || '').split(';').map(v => v.trim()).find(v => v.startsWith('neo_pass_session='))?.slice('neo_pass_session='.length) || '';
  function claimsFor(req) {
    const claims = verifyNeopassToken(tokenFrom(req), { secret, issuer: 'neo-pass', now });
    if (!claims || claims.token_use !== 'passkey-session' || claims.aud !== origin || !Number.isFinite(claims.exp) || !Number.isFinite(claims.iat) || claims.iat > now()/1000 + 30) return null;
    const session = store.session(claims.jti, now()), member = store.account(claims.sub);
    return session?.subject === claims.sub && member && member.status !== 'revoked' ? claims : null;
  }
  function issue(row) {
    const id = randomUUID();
    store.saveSession(id, row.subject, now() + 28800000);
    return { token: issueNeopassToken({ subject: row.subject, secret, issuer: 'neo-pass', now, claims: { aud: origin, jti: id, token_use: 'passkey-session', amr: ['webauthn', 'user-verification'] } }), member: memberView(row) };
  }
  return {
    origin, rpID,
    subjectResolver(req) { const claims = claimsFor(req); if (!claims) return null; req.neopassClaims = claims; return claims.sub; },
    async session(subject) { const row = store.account(subject); if (!row || row.status === 'revoked') throw Error('neopass_account_unavailable'); return memberView(row); },
    logout(req) { const claims = claimsFor(req); if (claims) store.revokeSession(claims.jti); },
    async registrationOptions({ username, displayName, subject = null } = {}) {
      let payload;
      if (subject) {
        const row = store.account(subject);
        if (!row || row.status === 'revoked') throw Error('neopass_account_unavailable');
        payload = { subject, username: row.username, displayName: row.display_name, existing: true };
      } else {
        username = String(username || '').trim().toLowerCase();
        if (!/^[a-z0-9][a-z0-9_-]{2,63}$/.test(username)) throw Error('passkey_username_invalid');
        if (store.usernameExists(username)) throw Error('passkey_username_unavailable');
        displayName = String(displayName || username).trim();
        if (!displayName || displayName.length > 80) throw Error('passkey_display_name_invalid');
        payload = { subject: `neopass:${randomUUID()}`, username, displayName, existing: false };
      }
      const options = await webauthn.generateRegistrationOptions({ rpName: 'NEOpass', rpID, userID: Buffer.from(payload.subject), userName: payload.username, userDisplayName: payload.displayName,
        attestationType: 'none', timeout: 60000, supportedAlgorithmIDs: [-7, -257],
        authenticatorSelection: { residentKey: 'required', userVerification: 'required' },
        excludeCredentials: store.credentials(payload.subject).map(row => ({ id: row.id, transports: JSON.parse(row.transports) })) });
      const handle = randomBytes(32).toString('base64url');
      store.saveCeremony(hash(handle), 'register', options.challenge, payload, now());
      return { handle, options };
    },
    async register(handle, response, subject = null) {
      directCeremony(response);
      if (!canonical(handle)) throw Error('passkey_challenge_expired');
      const id = hash(handle), row = store.ceremony(id, 'register', now());
      if (!row) throw Error('passkey_challenge_expired');
      const payload = JSON.parse(row.payload);
      if ((payload.existing && payload.subject !== subject) || (!payload.existing && subject)) throw Error('passkey_account_mismatch');
      const result = await webauthn.verifyRegistrationResponse({ response, expectedChallenge: row.challenge, expectedOrigin: origin, expectedRPID: rpID, requireUserVerification: true });
      const info = result.registrationInfo;
      if (!result.verified || !info?.userVerified) throw Error('passkey_verification_failed');
      // Enforce the requested device-only policy; do not silently accept cloud-backed credentials.
      if (info.credentialDeviceType !== 'singleDevice' || info.credentialBackedUp) throw Error('device_bound_passkey_required');
      return issue(store.register(id, info.credential, now()));
    },
    async authenticationOptions() {
      const options = await webauthn.generateAuthenticationOptions({ rpID, userVerification: 'required', timeout: 60000 });
      const handle = randomBytes(32).toString('base64url');
      store.saveCeremony(hash(handle), 'authenticate', options.challenge, {}, now());
      return { handle, options };
    },
    async authenticate(handle, response) {
      directCeremony(response);
      if (!canonical(handle) || !canonical(response?.id)) throw Error('passkey_verification_failed');
      const id = hash(handle), row = store.ceremony(id, 'authenticate', now()), credential = store.credential(response.id);
      if (!row || !credential) throw Error('passkey_verification_failed');
      if (response.response?.userHandle && response.response.userHandle !== Buffer.from(credential.subject).toString('base64url')) throw Error('passkey_account_mismatch');
      const result = await webauthn.verifyAuthenticationResponse({ response, expectedChallenge: row.challenge, expectedOrigin: origin, expectedRPID: rpID, requireUserVerification: true,
        credential: { id: credential.id, publicKey: new Uint8Array(credential.public_key), counter: credential.counter, transports: JSON.parse(credential.transports) } });
      if (!result.verified || result.authenticationInfo?.credentialDeviceType !== 'singleDevice' || result.authenticationInfo?.credentialBackedUp) throw Error('passkey_verification_failed');
      return issue(store.authenticate(id, credential.id, credential.counter, result.authenticationInfo.newCounter, now()));
    }
  };
}
