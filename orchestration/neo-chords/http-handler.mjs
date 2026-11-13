/**
 * Optional HTTP ingress for the existing NEO Platform API. It must be
 * mounted with the real NEOpass JWT subject resolver and an authoritative
 * scope lookup; untrusted request headers/body never grant identity or scope.
 */
export function createChordsOrderHttpHandler({ handoff, subjectResolver, authorizeScopes } = {}) {
  if (!handoff || typeof handoff.submit !== 'function' || typeof subjectResolver !== 'function' || typeof authorizeScopes !== 'function')
    throw new TypeError('authenticated_chords_dependencies_required');
  const send = (res, status, body) => {
    res.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', 'x-content-type-options': 'nosniff' });
    res.end(JSON.stringify(body));
  };
  return async function chordsHttp(req, res) {
    if (req.method !== 'POST') return send(res, 405, { error: 'method_not_allowed' });
    if (req.headers['sec-fetch-site'] === 'cross-site') return send(res, 403, { error: 'cross_site_request_blocked' });
    if (!/^Bearer\s+\S+$/.test(String(req.headers.authorization || ''))) return send(res, 401, { error: 'bearer_auth_required' });
    const subject = subjectResolver(req);
    if (!subject) return send(res, 401, { error: 'neopass_identity_required' });
    let scopes;
    try { scopes = await authorizeScopes(subject, req.neopassClaims || {}); }
    catch { return send(res, 403, { error: 'operator_scope_unavailable' }); }
    if (!Array.isArray(scopes) || !scopes.includes('chords.gate.propose')) return send(res, 403, { error: 'operator_scope_required' });
    if (!/^application\/json(?:\s*;|$)/i.test(String(req.headers['content-type'] || ''))) return send(res, 415, { error: 'json_required' });
    let raw = '', bytes = 0;
    try {
      for await (const chunk of req) {
        bytes += Buffer.byteLength(chunk);
        if (bytes > 5000) return send(res, 413, { error: 'request_too_large' });
        raw += chunk.toString('utf8');
      }
    } catch { return send(res, 400, { error: 'read_failed' }); }
    let body;
    try { body = JSON.parse(raw); }
    catch { return send(res, 400, { error: 'invalid_json' }); }
    if (typeof body?.utterance !== 'string' || !Number.isSafeInteger(body.expectedRevision))
      return send(res, 400, { error: 'invalid_gate_order' });
    try {
      const result = await handoff.submit({
        utterance: body.utterance, expectedRevision: body.expectedRevision, source: 'operator_text',
        authContext: { verified: true, subjectId: subject, scopes }
      });
      const status = result.status === 'DUPLICATE' ? 200 : result.status === 'BLOCKED' ? 409 : result.status === 'UNRECOGNIZED' ? 422 : 202;
      return send(res, status, { ...result, executes: false });
    } catch (error) {
      if (error?.message === 'stale_gate_revision') return send(res, 409, { error: 'stale_gate_revision' });
      if (error?.message === 'verified_operator_scope_required') return send(res, 403, { error: 'operator_scope_required' });
      return send(res, 503, { error: 'chords_handoff_failed' });
    }
  };
}
