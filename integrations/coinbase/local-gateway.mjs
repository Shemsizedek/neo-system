// NEO Project 144: loopback-only offline preview. No Coinbase API connectivity or transfers.
import http from 'node:http';
import {createHash, timingSafeEqual} from 'node:crypto';
import {createCoinbaseSandbox} from './sandbox.mjs';

const LIMIT = 2048;
const headers = {
  'content-type': 'application/json; charset=utf-8',
  'cache-control': 'no-store',
  'x-content-type-options': 'nosniff',
  'referrer-policy': 'no-referrer',
  'content-security-policy': "default-src 'none'",
};

function write(res, status, body) {
  res.writeHead(status, headers);
  res.end(JSON.stringify(body));
}

function validToken(actual, expected) {
  if (typeof actual !== 'string' || !actual.startsWith('Bearer ') || actual.length > 2048) return false;
  const provided = actual.slice(7);
  const digest = value => createHash('sha256').update(value).digest();
  return timingSafeEqual(digest(provided), digest(expected));
}

async function parseRequest(req) {
  if (req.headers['content-type'] !== 'application/json') throw new Error('invalid_content_type');
  if (Number(req.headers['content-length'] || 0) > LIMIT) throw new Error('body_too_large');
  const chunks = [];
  let bytes = 0;
  for await (const part of req) {
    bytes += part.length;
    if (bytes > LIMIT) throw new Error('body_too_large');
    chunks.push(part);
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8'));
  } catch {
    throw new Error('invalid_json');
  }
}

/**
 * Deliberately not a Coinbase connector. Creates an offline simulator endpoint
 * that can only bind to IPv4 loopback, with caller-supplied audit sink.
 * Constructor refuses to run without explicit enablement and kill-switch release.
 */
export function createCoinbaseLocalGateway({
  enabled = false,
  killSwitch = true,
  authToken = '',
  onAudit,
  maxRequestsPerMinute = 20,
  now = () => Date.now(),
} = {}) {
  if (!enabled || killSwitch) throw new Error('gateway_disabled');
  if (typeof authToken !== 'string' || authToken.length < 32 || authToken.length > 512) {
    throw new Error('dedicated_gateway_auth_required');
  }
  if (typeof onAudit !== 'function') throw new Error('audit_sink_required');
  if (!Number.isInteger(maxRequestsPerMinute) || maxRequestsPerMinute < 1 || maxRequestsPerMinute > 100) {
    throw new Error('invalid_rate_limit');
  }
  if (typeof now !== 'function') throw new TypeError('clock_required');

  const sandbox = createCoinbaseSandbox({enabled: true});
  let windowStart = now();
  let requests = 0;
  const server = http.createServer(async (req, res) => {
    // Local process boundary, not a reverse-proxy-facing or public service.
    if (req.socket.remoteAddress !== '127.0.0.1' || req.headers.origin) {
      return write(res, 403, {error: 'forbidden'});
    }
    if (req.method === 'GET' && req.url === '/healthz') {
      return write(res, 200, {service: 'neo-coinbase-local-preview', mode: 'offline', executable: false});
    }
    if (req.method !== 'POST' || req.url !== '/v1/preview') {
      return write(res, 404, {error: 'not_found'});
    }
    const timestamp = now();
    if (timestamp - windowStart >= 60000 || timestamp < windowStart) {
      windowStart = timestamp;
      requests = 0;
    }
    if (++requests > maxRequestsPerMinute) return write(res, 429, {error: 'rate_limited'});
    if (!validToken(req.headers.authorization, authToken)) {
      return write(res, 401, {error: 'unauthorized'});
    }
    try {
      const input = await parseRequest(req);
      const result = sandbox.evaluate(input);
      // No audit success means no successful response.
      await onAudit(Object.freeze({
        event: 'coinbase_local_preview',
        provider: 'coinbase',
        service: result.service,
        action: result.action,
        network: 'bitcoin',
        asset: 'BTC',
        status: 'simulation',
      }));
      return write(res, 200, result);
    } catch {
      // Do not echo source records, secrets, or provider errors into responses.
      return write(res, 400, {error: 'invalid_preview_request'});
    }
  });

  server.headersTimeout = 10_000;
  server.requestTimeout = 10_000;
  server.keepAliveTimeout = 1_000;
  server.maxRequestsPerSocket = 50;

  let started = false;
  return Object.freeze({
    async start({port = 0} = {}) {
      if (started) throw new Error('already_started');
      if (!Number.isInteger(port) || port < 0 || port > 65535) throw new Error('invalid_port');
      started = true;
      try {
        await new Promise((resolve, reject) => {
          const onListening = () => {
            server.off('error', onError);
            resolve();
          };
          const onError = error => {
            server.off('listening', onListening);
            reject(error);
          };
          server.once('listening', onListening);
          server.once('error', onError);
          try {
            server.listen(port, '127.0.0.1');
          } catch (error) {
            server.off('listening', onListening);
            server.off('error', onError);
            reject(error);
          }
        });
        return 'http://127.0.0.1:' + server.address().port;
      } catch (error) {
        started = false;
        throw error;
      }
    },
    async stop() {
      if (!started) return;
      await new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
      started = false;
    },
  });
}
