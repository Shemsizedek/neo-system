// NEO PassKey Project 144: isolated, unmounted HTTP adapter contract.
// Does not create a server, grant permissions, or issue tokens.
const paths = Object.freeze({
  registerBegin: '/api/neopass/authenticator/registration/options',
  registerFinish: '/api/neopass/authenticator/registration/verify',
  authenticateBegin: '/api/neopass/authenticator/authentication/options',
  authenticateFinish: '/api/neopass/authenticator/authentication/verify'
});
const names = new Set(Object.values(paths));
const challengePattern = /^[A-Za-z0-9_-]{43}$/;
const credentialIdPattern = /^[A-Za-z0-9_-]{8,1024}$/;
const sessionKeyPattern = /^[A-Za-z0-9_-]{16,256}$/;
const headers = {
  'Content-Type': 'application/json; charset=utf-8',
  'Cache-Control': 'no-store',
  'X-Content-Type-Options': 'nosniff',
  'Content-Security-Policy': "default-src 'none'"
};
function response(status, body) {
  return new Response(JSON.stringify(body), {status, headers});
}
function decodeClientData(credential, expectedType, origin, challenge) {
  const encoded = credential?.response?.clientDataJSON;
  if (credential?.type !== 'public-key' ||
      !credentialIdPattern.test(credential?.id ?? '') ||
      credential.rawId !== credential.id ||
      typeof encoded !== 'string' ||
      encoded.length > 16384 ||
      !/^[A-Za-z0-9_-]+$/.test(encoded)) return false;
  try {
    const bytes = Buffer.from(encoded, 'base64url');
    if (bytes.length > 8192) return false;
    const client = JSON.parse(bytes.toString('utf8'));
    return client?.type === expectedType && client.origin === origin &&
      client.crossOrigin !== true && client.challenge === challenge;
  } catch { return false; }
}
export function createIsolatedStagingHttpAdapter({
  enabled = false, origin, rpId, staging, authenticateRequest,
  verifyCsrf, takeRateLimit, lookupCredentialId, authorizeEnrollment,
  ceremonies, now = () => Date.now()
} = {}) {
  // An inactive adapter always refuses; importing this module cannot open routes.
  if (enabled !== true) return async () => response(503, {error:'staging_disabled'});
  if (typeof rpId !== 'string' || !/^[a-z0-9.-]+$/.test(rpId) ||
      origin !== `https://${rpId}` ||
      [authenticateRequest, verifyCsrf, takeRateLimit, lookupCredentialId,
       authorizeEnrollment, now].some(x => typeof x !== 'function') ||
      ['beginAuthentication','verifyAuthentication','beginRegistration',
       'finishRegistration'].some(name => typeof staging?.[name] !== 'function') ||
      ['put','take'].some(name => typeof ceremonies?.[name] !== 'function')) {
    throw new Error('isolated_staging_dependencies_required');
  }
  return async function handle(request) {
    try {
      if (!(request instanceof Request)) return response(400,{error:'invalid_request'});
      const url = new URL(request.url);
      if (url.origin !== origin || !names.has(url.pathname) || url.search) {
        return response(404,{error:'not_found'});
      }
      if (request.method !== 'POST') return response(405,{error:'method_not_allowed'});
      if (request.headers.get('origin') !== origin ||
          !['same-origin',null].includes(request.headers.get('sec-fetch-site'))) {
        return response(403,{error:'forbidden'});
      }
      if (request.headers.get('content-type')?.split(';')[0].trim().toLowerCase() !== 'application/json') {
        return response(415,{error:'unsupported_media_type'});
      }
      const size = request.headers.get('content-length');
      if (size && (!/^\d+$/.test(size) || Number(size) > 65536)) return response(413,{error:'payload_too_large'});
      const context = await authenticateRequest({request});
      if (!context || typeof context.subject !== 'string' ||
          !context.subject || context.subject.length > 256 ||
          !sessionKeyPattern.test(context.sessionKey ?? '') ||
          !context.session) return response(401,{error:'unauthorized'});
      const csrf = request.headers.get('x-csrf-token');
      if (!csrf || csrf.length > 256 ||
          await verifyCsrf({request,context,token:csrf}) !== true) {
        return response(403,{error:'forbidden'});
      }
      if (await takeRateLimit({request,context,path:url.pathname}) !== true) {
        return response(429,{error:'rate_limited'});
      }
      const raw = await request.text();
      if (Buffer.byteLength(raw, 'utf8') > 65536) return response(413,{error:'payload_too_large'});
      let body;
      try { body = JSON.parse(raw); } catch { return response(400,{error:'invalid_json'}); }
      if (!body || typeof body !== 'object' || Array.isArray(body)) return response(400,{error:'invalid_json'});
      const finishing = [paths.registerFinish, paths.authenticateFinish].includes(url.pathname);
      if (finishing ? (Object.keys(body).length !== 1 || !Object.hasOwn(body,'credential'))
                    : Object.keys(body).length !== 0) return response(400,{error:'invalid_payload'});
      const scope = {subject:context.subject,sessionKey:context.sessionKey};
      if (url.pathname === paths.registerBegin) {
        // This trust callback must read an independently verified server-side
        // step-up or two-person bootstrap; never trust flags from request JSON.
        const approval = await authorizeEnrollment({request,context});
        if (approval?.allowed !== true ||
            (!approval.stepUpResponse && !approval.bootstrapEvidence)) {
          return response(403,{error:'enrollment_not_authorized'});
        }
        const issued = await staging.beginRegistration({
          session:context.session,stepUpResponse:approval.stepUpResponse,
          bootstrapEvidence:approval.bootstrapEvidence
        });
        if (!challengePattern.test(issued?.publicKey?.challenge ?? '') ||
            !Number.isFinite(issued?.expiresAt) ||
            issued.expiresAt <= now() || issued.expiresAt > now()+300000) {
          return response(503,{error:'invalid_staging_response'});
        }
        await ceremonies.put({...scope,kind:'registration',
          challenge:issued.publicKey.challenge,expiresAt:issued.expiresAt});
        return response(200,issued);
      }
      if (url.pathname === paths.authenticateBegin) {
        const credentialId = await lookupCredentialId({request,context});
        if (!credentialIdPattern.test(credentialId ?? '')) return response(403,{error:'no_registered_credential'});
        const issued = await staging.beginAuthentication({session:context.session,credentialId});
        if (!challengePattern.test(issued?.publicKey?.challenge ?? '') ||
            !Number.isFinite(issued?.expiresAt) ||
            issued.expiresAt <= now() || issued.expiresAt > now()+300000) {
          return response(503,{error:'invalid_staging_response'});
        }
        await ceremonies.put({...scope,kind:'authentication',
          challenge:issued.publicKey.challenge,expiresAt:issued.expiresAt});
        return response(200,issued);
      }
      const kind = url.pathname === paths.registerFinish ? 'registration':'authentication';
      // take MUST be atomic, durable, session-bound and one-use. Taking first
      // denies retries on invalid payloads; NEO Key also consumes its DB challenge.
      const pending = await ceremonies.take({...scope,kind});
      if (!pending || pending.subject !== context.subject ||
          pending.sessionKey !== context.sessionKey || pending.kind !== kind ||
          !challengePattern.test(pending.challenge ?? '') ||
          !Number.isFinite(pending.expiresAt) || pending.expiresAt <= now() ||
          !decodeClientData(body.credential, kind === 'registration' ? 'webauthn.create' : 'webauthn.get',origin,pending.challenge)) {
        return response(403,{error:'ceremony_rejected'});
      }
      if (kind === 'registration') {
        const result = await staging.finishRegistration({session:context.session,
          challenge:pending.challenge,response:body.credential});
        if (result?.registered !== true || result.permissionGranted !== false ||
            result.credentialId !== body.credential.id) return response(403,{error:'verification_rejected'});
        return response(200,{registered:true,credentialId:result.credentialId,permissionGranted:false});
      }
      const proof = await staging.verifyAuthentication({response:body.credential});
      if (!proof || proof.assurance !== 'webauthn-verified' ||
          proof.subject !== context.subject || proof.credentialId !== body.credential.id ||
          proof.origin !== origin || proof.rpId !== rpId ||
          proof.action !== 'authenticate' || proof.purpose !== 'authenticate' ||
          !Number.isSafeInteger(proof.verifiedAt) || proof.verifiedAt > now() ||
          now() - proof.verifiedAt > 60000) {
        return response(403,{error:'verification_rejected'});
      }
      return response(200,{verified:true,credentialId:proof.credentialId,permissionGranted:false});
    } catch {
      // No internal errors, credentials, identity values, or request bodies in response.
      return response(503,{error:'staging_unavailable'});
    }
  };
}
