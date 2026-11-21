// Browser transport only. The trusted server owns challenges, sessions, RP ID, and authorization.
export function decodeBase64url(value) {
  if (typeof value !== 'string' || !/^[A-Za-z0-9_-]+$/.test(value)) throw new TypeError('invalid_base64url');
  const value64 = value.replace(/-/g, '+').replace(/_/g, '/');
  return Uint8Array.from(atob(value64.padEnd(Math.ceil(value64.length / 4) * 4, '=')), char => char.charCodeAt(0));
}
export function encodeBase64url(bytes) {
  const data = bytes instanceof ArrayBuffer ? new Uint8Array(bytes) : bytes;
  if (!(data instanceof Uint8Array)) throw new TypeError('expected_bytes');
  return btoa(Array.from(data, byte => String.fromCharCode(byte)).join('')).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
export function parseCreationOptions(options) {
  if (!options?.publicKey || typeof options.publicKey.challenge !== 'string' || typeof options.publicKey.user?.id !== 'string') throw new TypeError('invalid_creation_options');
  const key = options.publicKey;
  return { publicKey: { ...key, challenge: decodeBase64url(key.challenge), user: { ...key.user, id: decodeBase64url(key.user.id) }, excludeCredentials: (key.excludeCredentials || []).map(item => ({ ...item, id: decodeBase64url(item.id) })) } };
}
export function parseRequestOptions(options) {
  if (!options?.publicKey || typeof options.publicKey.challenge !== 'string') throw new TypeError('invalid_request_options');
  const key = options.publicKey;
  return { publicKey: { ...key, challenge: decodeBase64url(key.challenge), allowCredentials: (key.allowCredentials || []).map(item => ({ ...item, id: decodeBase64url(item.id) })) } };
}
export function serializeCredential(credential) {
  if (!credential || credential.type !== 'public-key' || !credential.response) throw new TypeError('invalid_credential');
  const output = {};
  for (const name of ['clientDataJSON','attestationObject','authenticatorData','signature','userHandle']) {
    if (credential.response[name] != null) output[name] = encodeBase64url(credential.response[name]);
  }
  if (!output.clientDataJSON) throw new TypeError('missing_client_data');
  return { id: credential.id, rawId: encodeBase64url(credential.rawId), type: credential.type, response: output, clientExtensionResults: credential.getClientExtensionResults?.() || {} };
}
export function makeAuthenticatorClient({ fetcher = globalThis.fetch, credentials = globalThis.navigator?.credentials, origin = globalThis.location?.origin, csrfToken }) {
  if (typeof fetcher !== 'function') throw new TypeError('fetch_required');
  if (!origin || (!/^https:\/\//.test(origin) && !/^http:\/\/localhost(?::\d+)?$/.test(origin))) throw new Error('secure_origin_required');
  async function api(path, body = {}) {
    const response = await fetcher(path, { method:'POST', credentials:'same-origin', headers:{ 'Content-Type':'application/json', ...(csrfToken ? { 'X-CSRF-Token':csrfToken } : {}) }, body:JSON.stringify(body) });
    if (!response.ok) throw new Error('neopass_api_error_' + response.status);
    return response.json();
  }
  return {
    async enroll() {
      if (typeof credentials?.create !== 'function') throw new Error('webauthn_unavailable');
      const options = await api('/api/neopass/authenticator/registration/options');
      const credential = await credentials.create(parseCreationOptions(options));
      if (!credential) throw new Error('registration_cancelled');
      return api('/api/neopass/authenticator/registration/verify', { credential:serializeCredential(credential) });
    },
    async authenticate() {
      if (typeof credentials?.get !== 'function') throw new Error('webauthn_unavailable');
      const options = await api('/api/neopass/authenticator/authentication/options');
      const credential = await credentials.get(parseRequestOptions(options));
      if (!credential) throw new Error('authentication_cancelled');
      return api('/api/neopass/authenticator/authentication/verify', { credential:serializeCredential(credential) });
    }
  };
}
