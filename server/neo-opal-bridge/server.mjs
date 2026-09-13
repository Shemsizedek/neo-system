import http from 'node:http';
import { timingSafeEqual } from 'node:crypto';

const SERVICE = 'neo-opal-bridge';
const DOMAIN = 'opal.holytemples.org';
const MAX_BODY_BYTES = 2 * 1024 * 1024;
const ALLOWED_ORIGINS = new Set([
  'https://holytemples.org',
  'https://www.holytemples.org',
  'https://neo.holytemples.org',
  'https://opal.holytemples.org'
]);

function json(res, status, body, extra = {}) {
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
    'x-content-type-options': 'nosniff',
    'referrer-policy': 'no-referrer',
    ...extra
  });
  res.end(JSON.stringify(body));
}

function cors(req) {
  const origin = String(req.headers.origin || '');
  if (!ALLOWED_ORIGINS.has(origin)) return {};
  return {
    'access-control-allow-origin': origin,
    'access-control-allow-methods': 'GET,POST,OPTIONS',
    'access-control-allow-headers': 'Authorization,Content-Type,X-NEO-Approved',
    vary: 'Origin'
  };
}

function authorized(req, token) {
  if (!token) return false;
  const supplied = String(req.headers.authorization || '').replace(/^Bearer\s+/i, '');
  const a = Buffer.from(supplied);
  const b = Buffer.from(token);
  return a.length === b.length && a.length > 0 && timingSafeEqual(a, b);
}

async function readJson(req) {
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > MAX_BODY_BYTES) throw Object.assign(new Error('PAYLOAD_TOO_LARGE'), { status: 413 });
    chunks.push(chunk);
  }
  if (!chunks.length) return {};
  try { return JSON.parse(Buffer.concat(chunks).toString('utf8')); }
  catch { throw Object.assign(new Error('INVALID_JSON'), { status: 400 }); }
}

function slugify(value = '') {
  return String(value).toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 64);
}

function validateTargetHost(host) {
  const value = String(host || '').toLowerCase().trim();
  if (!value.endsWith('.holytemples.org')) throw Object.assign(new Error('TARGET_HOST_NOT_ALLOWED'), { status: 400 });
  if (!/^[a-z0-9.-]+$/.test(value)) throw Object.assign(new Error('TARGET_HOST_INVALID'), { status: 400 });
  return value;
}

function validateOpalUrl(value) {
  const url = new URL(String(value || ''));
  if (url.protocol !== 'https:' || url.hostname !== 'opal.google') throw Object.assign(new Error('OPAL_URL_INVALID'), { status: 400 });
  return url.toString();
}

function validateFiles(files = []) {
  if (!Array.isArray(files)) throw Object.assign(new Error('FILES_INVALID'), { status: 400 });
  return files.map((file) => {
    const path = String(file?.path || '').replace(/^\/+/, '');
    const content = String(file?.content ?? '');
    if (!path || path.includes('..') || path.startsWith('.git/')) throw Object.assign(new Error('FILE_PATH_INVALID'), { status: 400 });
    if (Buffer.byteLength(content, 'utf8') > 512 * 1024) throw Object.assign(new Error('FILE_TOO_LARGE'), { status: 413 });
    return { path, content };
  });
}

function buildDelivery(body) {
  const name = String(body.name || '').trim();
  const slug = slugify(body.slug || name);
  if (!name || !slug) throw Object.assign(new Error('APP_NAME_REQUIRED'), { status: 400 });
  const targetHost = validateTargetHost(body.targetHost);
  const opalUrl = body.opalUrl ? validateOpalUrl(body.opalUrl) : null;
  const files = validateFiles(body.files || []);
  const mode = files.length ? 'artifact-delivery' : 'opal-link-registration';
  return {
    schema: 'neo.opal.delivery.v1',
    service: SERVICE,
    app: { name, slug, opalUrl, targetHost },
    mode,
    repository: 'Shemsizedek/neo-system',
    delivery: {
      branch: `feat/opal-${slug}`,
      appRoot: `apps/opal/${slug}`,
      deployRoot: `deploy/opal/${slug}`,
      hostRegistry: 'architecture/neo-hosts.json',
      files
    },
    controls: {
      requiresOperatorApproval: true,
      secretsRuntimeOnly: true,
      allowedDomainSuffix: '.holytemples.org',
      directOpalPull: false,
      directOpalPullReason: 'No public Google Opal source-export API is configured; use an Opal share link or submit exported/generated source files.'
    }
  };
}

export function createOpalBridgeServer(env = process.env) {
  return http.createServer(async (req, res) => {
    const headers = cors(req);
    if (req.method === 'OPTIONS') return json(res, 204, {}, headers);
    const url = new URL(req.url || '/', 'http://localhost');

    if (req.method === 'GET' && url.pathname === '/health') {
      return json(res, 200, { ok: true, service: SERVICE, domain: DOMAIN, mode: 'production' }, headers);
    }
    if (req.method === 'GET' && url.pathname === '/api/opal/status') {
      return json(res, 200, {
        ok: true,
        service: SERVICE,
        domain: DOMAIN,
        capabilities: ['register-opal-link', 'prepare-code-delivery', 'validate-holytemples-target', 'emit-neo-system-manifest'],
        provider: { name: 'Google Opal', directExportApiConfigured: false }
      }, headers);
    }
    if (req.method === 'POST' && url.pathname === '/api/opal/prepare') {
      if (!authorized(req, env.NEO_OPAL_BRIDGE_TOKEN)) return json(res, 401, { error: 'UNAUTHORIZED' }, headers);
      if (req.headers['x-neo-approved'] !== 'true') return json(res, 403, { error: 'APPROVAL_REQUIRED' }, headers);
      try {
        const body = await readJson(req);
        return json(res, 200, { ok: true, manifest: buildDelivery(body) }, headers);
      } catch (error) {
        return json(res, error.status || 500, { error: error.message || 'PREPARE_FAILED' }, headers);
      }
    }
    return json(res, 404, { error: 'NOT_FOUND' }, headers);
  });
}

if (process.argv[1] === new URL(import.meta.url).pathname) {
  const port = Number(process.env.PORT || 8080);
  createOpalBridgeServer().listen(port, '0.0.0.0', () => console.log(`${SERVICE} listening on ${port}`));
}
