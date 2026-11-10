import { createPublicKey, verify as verifySignature } from 'node:crypto';

const ISSUER = 'https://token.actions.githubusercontent.com';
const JWKS = 'https://token.actions.githubusercontent.com/.well-known/jwks';
const AUDIENCE = 'neo-nous-staging-ci';
const REPOSITORY = 'Shemsizedek/neo-system';
const REPOSITORY_ID = '1332533328';
const WORKFLOW = 'NEO Nous OS hosted staging smoke';
const WORKFLOW_REF = REPOSITORY + '/.github/workflows/nous-hosted-smoke.yml@refs/pull/1388/merge';
const HEAD_REF = 'feature/nous-os-core-runtime-p144-20261109';
const REF = 'refs/pull/1388/merge';

export class StagingOidcError extends Error {
  constructor(code, status = 401) { super(code); this.code = code; this.status = status; }
}
function decodePart(part) {
  if (typeof part !== 'string' || !/^[a-zA-Z0-9_-]{1,6000}$/.test(part)) throw new StagingOidcError('invalid_staging_token');
  try { return JSON.parse(Buffer.from(part, 'base64url').toString('utf8')); }
  catch { throw new StagingOidcError('invalid_staging_token'); }
}

/**
 * Additional STAGING-ONLY identity boundary for GitHub hosted smoke tests.
 * No shared signing keys or credentials. Authorization is fixed to one repo,
 * one PR, one workflow and a single non-executing planning capability.
 * Never expose this verifier on a production environment.
 */
export function createStagingOidcVerifier({ fetchImpl = fetch, now = () => Date.now(), cacheMs = 10 * 60 * 1000 } = {}) {
  let cachedKeys = [];
  let refreshBy = 0;
  async function keys() {
    if (cachedKeys.length && now() < refreshBy) return cachedKeys;
    let response;
    try { response = await fetchImpl(JWKS, { signal: AbortSignal.timeout(5000), redirect: 'error' }); }
    catch { throw new StagingOidcError('staging_oidc_keys_unavailable', 503); }
    if (!response.ok) throw new StagingOidcError('staging_oidc_keys_unavailable', 503);
    let data;
    try { data = await response.json(); } catch { throw new StagingOidcError('staging_oidc_keys_invalid', 503); }
    if (!Array.isArray(data.keys) || data.keys.length > 20) throw new StagingOidcError('staging_oidc_keys_invalid', 503);
    cachedKeys = data.keys.filter(k => k.kty === 'RSA' && k.use === 'sig' && k.kid && k.n && k.e && (!k.alg || k.alg === 'RS256'));
    if (!cachedKeys.length) throw new StagingOidcError('staging_oidc_keys_invalid', 503);
    refreshBy = now() + cacheMs;
    return cachedKeys;
  }
  return {
    async verifyAuthorization(header) {
      if (typeof header !== 'string' || !/^Bearer [a-zA-Z0-9_.-]+$/.test(header) || header.length > 9000) {
        throw new StagingOidcError('staging_bearer_required');
      }
      const segments = header.slice(7).split('.');
      if (segments.length !== 3) throw new StagingOidcError('invalid_staging_token');
      const [protectedPart, payloadPart, signaturePart] = segments;
      const meta = decodePart(protectedPart);
      const claims = decodePart(payloadPart);
      if (meta?.alg !== 'RS256' || typeof meta.kid !== 'string' || meta.kid.length > 200 ||
          (meta.typ && meta.typ !== 'JWT') || !/^[a-zA-Z0-9_-]+$/.test(signaturePart)) {
        throw new StagingOidcError('invalid_staging_algorithm');
      }
      const jwks = await keys();
      const jwk = jwks.find(key => key.kid === meta.kid);
      if (!jwk) throw new StagingOidcError('unknown_staging_signing_key');
      let signatureValid = false;
      try {
        const key = createPublicKey({ key: jwk, format: 'jwk' });
        signatureValid = verifySignature('RSA-SHA256', Buffer.from(protectedPart + '.' + payloadPart), key, Buffer.from(signaturePart, 'base64url'));
      } catch { /* invalid key or signature */ }
      if (!signatureValid) throw new StagingOidcError('invalid_staging_signature');
      const clock = Math.floor(now() / 1000);
      if (claims?.iss !== ISSUER || claims.aud !== AUDIENCE ||
          !Number.isSafeInteger(claims.iat) || !Number.isSafeInteger(claims.nbf) || !Number.isSafeInteger(claims.exp) ||
          claims.iat > clock + 30 || claims.iat < clock - 600 ||
          claims.nbf > clock || claims.exp <= clock || claims.exp - claims.iat > 600) {
        throw new StagingOidcError('invalid_staging_claims');
      }
      if (String(claims.repository_id) !== REPOSITORY_ID || claims.repository !== REPOSITORY ||
          claims.ref !== REF || claims.event_name !== 'pull_request' ||
          claims.head_ref !== HEAD_REF || claims.base_ref !== 'main' ||
          claims.workflow !== WORKFLOW || claims.workflow_ref !== WORKFLOW_REF ||
          claims.runner_environment !== 'github-hosted' ||
          claims.sub !== 'repo:Shemsizedek/neo-system:pull_request') {
        throw new StagingOidcError('staging_workflow_not_authorized', 403);
      }
      return Object.freeze({ subject: 'github-actions-nous-staging', scopes: new Set(['nous.task.plan']), issuer: ISSUER });
    },
  };
}

test('staging receipt endpoint is off by default, accepts signed scoped workflow only, replays safely', async () => {
  const { createNousServer } = await import('./server.mjs');
  const { createNousRuntime } = await import('./runtime.mjs');
  const { createIdentityVerifier } = await import('./identity.mjs');
  const receipt = new Map();
  const db = {
    stats: () => ({ backend: 'postgresql', durable: true }),
    async ping() { return true; },
    async getOrCreate(value) {
      const key = value.subject + '/' + value.requestId;
      if (receipt.has(key)) return { receipt: receipt.get(key), inserted: false };
      receipt.set(key, value);
      return { receipt: value, inserted: true };
    },
  };
  const runtime = createNousRuntime({ identityVerifier: createIdentityVerifier({}), postgresReceiptStore: db });
  for (const enabled of [false, true]) {
    const server = createNousServer({ runtime, stagingOidcVerifier: enabled ? verifier() : null });
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    try {
      const url = 'http://127.0.0.1:' + server.address().port + '/v1/staging/receipt';
      const post = (body, authorization = jwt()) => fetch(url, {
        method: 'POST', headers: { authorization, 'content-type': 'application/json' }, body: JSON.stringify(body),
      });
      if (!enabled) { assert.equal((await post({ requestId: 'CI-P144-SMOKE-1' })).status, 404); continue; }
      assert.equal((await post({ requestId: 'CI-P144-SMOKE-1' }, 'Bearer fake')).status, 401);
      assert.equal((await post({ requestId: 'INVALID' })).status, 400);
      const response = await post({ requestId: 'CI-P144-SMOKE-1' });
      assert.equal(response.status, 200);
      const first = await response.json();
      assert.equal(first.capability, 'development.plan');
      assert.equal(first.execution, 'disabled');
      assert.equal(first.subject, 'github-actions-nous-staging');
      assert.deepEqual(await (await post({ requestId: 'CI-P144-SMOKE-1' })).json(), first);
      assert.equal((await post({ requestId: 'CI-P144-SMOKE-1', capability: 'finance.transfer' })).status, 400);
    } finally { await new Promise(resolve => server.close(resolve)); }
  }
});
