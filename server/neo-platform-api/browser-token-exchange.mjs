const DEFAULT_ALLOWED_ORIGINS = new Set([
  'https://holytemples.org',
  'https://www.holytemples.org',
]);

function writeJson(res, status, body, origin = '') {
  const payload = JSON.stringify(body);
  const headers = {
    'content-type': 'application/json; charset=utf-8',
    'content-length': Buffer.byteLength(payload),
    'cache-control': 'no-store',
    'x-content-type-options': 'nosniff',
    vary: 'Origin',
  };
  if (origin) {
    headers['access-control-allow-origin'] = origin;
    headers['access-control-allow-credentials'] = 'true';
  }
  res.writeHead(status, headers);
  res.end(payload);
}

function allowedOrigin(req, allowedOrigins) {
  const origin = String(req.headers.origin || '');
  if (!origin) return '';
  return allowedOrigins.has(origin) ? origin : null;
}

export function attachNeopassBrowserTokenExchange(server, {
  authService,
  subjectResolver,
  allowedOrigins = DEFAULT_ALLOWED_ORIGINS,
} = {}) {
  if (!server || typeof server.listeners !== 'function') throw new Error('http_server_required');
  if (!authService || typeof authService.browserToken !== 'function') throw new Error('browser_token_auth_service_required');
  if (typeof subjectResolver !== 'function') throw new Error('neopass_subject_resolver_required');

  const priorListeners = server.listeners('request');
  if (!priorListeners.length) throw new Error('platform_request_handler_required');
  server.removeAllListeners('request');

  server.on('request', async (req, res) => {
    const url = new URL(req.url || '/', 'http://neo.local');
    const isExchange = url.pathname === '/api/v1/auth/browser-token';

    if (!isExchange) {
      for (const listener of priorListeners) listener.call(server, req, res);
      return;
    }

    const origin = allowedOrigin(req, allowedOrigins);
    if (origin === null) return writeJson(res, 403, { error: 'origin_not_allowed' });

    if (req.method === 'OPTIONS') {
      const headers = {
        'access-control-allow-methods': 'GET,OPTIONS',
        'access-control-allow-headers': 'accept,content-type',
        'access-control-max-age': '600',
        vary: 'Origin',
      };
      if (origin) {
        headers['access-control-allow-origin'] = origin;
        headers['access-control-allow-credentials'] = 'true';
      }
      res.writeHead(204, headers);
      return res.end();
    }

    if (req.method !== 'GET') return writeJson(res, 405, { error: 'method_not_allowed' }, origin || '');

    const subject = subjectResolver(req);
    if (!subject) return writeJson(res, 401, { error: 'neopass_identity_required' }, origin || '');

    try {
      const result = await authService.browserToken(subject, req.neopassClaims || {});
      return writeJson(res, 200, {
        authenticated: true,
        token: result.token,
        expiresAt: result.expiresAt,
        member: result.member,
        scope: 'neo:oracle:execute',
      }, origin || '');
    } catch (error) {
      const code = error?.code || error?.message || 'browser_token_exchange_failed';
      const status = code === 'neopass_active_membership_required' ? 403 : 401;
      return writeJson(res, status, { error: code }, origin || '');
    }
  });

  return server;
}

export { DEFAULT_ALLOWED_ORIGINS };
