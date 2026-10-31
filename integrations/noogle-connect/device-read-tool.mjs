// Gate 2 contract only: intentionally not imported by stdio or public HTTP.
// The injected verifier MUST validate signature, issuer, resource audience,
// expiry, revocation and scopes against the actual configured OAuth provider.
export const deviceReadTool = Object.freeze({
  name: 'noogle_list_devices',
  description: 'List registered devices belonging to the authenticated account. Registration does not establish current online status.',
  inputSchema: { type: 'object', properties: {}, additionalProperties: false },
  annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  securitySchemes: [{ type: 'oauth2', scopes: ['devices:read'] }]
});
export function createDeviceReadTool({ verifyAccessToken, store }) {
  if (typeof verifyAccessToken !== 'function' || typeof store?.list !== 'function') throw Error('verified_identity_and_store_required');
  return async function listDevices(args, requestContext) {
    if (!args || typeof args !== 'object' || Array.isArray(args) || Object.keys(args).length) throw Error('invalid_arguments');
    // Transport-owned context only. Never merge model args or request JSON into
    // this context. Tokens must never enter tool results, errors or logs.
    const authorization = requestContext?.authorization;
    if (typeof authorization !== 'string' || !/^Bearer [^\s]+$/i.test(authorization)) throw Error('authentication_required');
    let identity;
    try { identity = await verifyAccessToken(authorization.slice(7)); }
    catch { throw Error('authentication_required'); }
    if (!identity || typeof identity.subject !== 'string' || !identity.subject.trim()) throw Error('authentication_required');
    if (!Array.isArray(identity.scopes) || !identity.scopes.includes('devices:read')) throw Error('insufficient_scope');
    // Identity comes exclusively from verified claims, not tool arguments.
    const records = await store.list(identity.subject);
    if (!Array.isArray(records)) throw Error('device_store_unavailable');
    return { devices: records.map(({ id, type, label, createdAt, revokedAt }) => ({ id, type, label, createdAt, revokedAt })),
      source: 'registered-devices', liveHealthChecked: false, deviceControlEnabled: false };
  };
}
