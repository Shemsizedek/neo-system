import http from 'node:http';
import crypto from 'node:crypto';

export const SERVICE = Object.freeze({
  name: 'NEO Guardian Control Plane',
  canonicalHost: 'neoguard.holytemples.org',
  schema: 'neo.guardian.control-plane.v1'
});

const MAX_BODY = 64 * 1024;
const ALLOWED_EVENT_SCHEMAS = new Set(['neo.hacker.endpoint-event.v1']);

function json(res, status, body) {
  const data = JSON.stringify(body);
  res.writeHead(status, {'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff'});
  res.end(data);
}

async function body(req) {
  let size = 0; const chunks = [];
  for await (const chunk of req) {
    size += chunk.length;
    if (size > MAX_BODY) throw new Error('body_too_large');
    chunks.push(chunk);
  }
  if (!chunks.length) return {};
  return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}

function validEndpointId(v) { return typeof v === 'string' && /^neo:endpoint:[A-Za-z0-9._:-]{1,180}$/.test(v); }
function validFingerprint(v) { return typeof v === 'string' && /^[A-Fa-f0-9:]{32,128}$/.test(v); }
function rejectSecrets(o) {
  const text = JSON.stringify(o).toLowerCase();
  const denied = ['pairingcode','pairing_code','adb_private','privatekey','private_key','password','seedphrase','seed_phrase','recoverycode','recovery_code','devicepin','device_pin'];
  if (denied.some(k => text.includes(`"${k}"`))) throw new Error('secret_material_refused');
}
function bearer(req) {
  const h = req.headers.authorization || '';
  return h.startsWith('Bearer ') && h.length > 24 ? h.slice(7) : null;
}
function tokenHash(token) { return crypto.createHash('sha256').update(token).digest('hex'); }

export function createNeoGuardServer({ enrollmentToken = process.env.NEOGUARD_ENROLLMENT_TOKEN || '', now = () => new Date() } = {}) {
  const devices = new Map();
  return http.createServer(async (req, res) => {
    try {
      const url = new URL(req.url, 'https://neoguard.holytemples.org');
      if (req.method === 'GET' && url.pathname === '/healthz') return json(res, 200, {ok:true, service:SERVICE.name, schema:SERVICE.schema});
      if (req.method !== 'POST') return json(res, 404, {error:'not_found'});
      const payload = await body(req); rejectSecrets(payload);

      if (url.pathname === '/v1/enroll') {
        const token = bearer(req);
        if (!enrollmentToken || !token || !crypto.timingSafeEqual(Buffer.from(tokenHash(token)), Buffer.from(tokenHash(enrollmentToken)))) return json(res, 401, {error:'unauthorized'});
        if (!validEndpointId(payload.endpointId) || !validFingerprint(payload.hostPublicKeyFingerprint)) return json(res, 400, {error:'invalid_enrollment'});
        const deviceToken = crypto.randomBytes(32).toString('base64url');
        devices.set(payload.endpointId, {tokenHash:tokenHash(deviceToken), fingerprint:payload.hostPublicKeyFingerprint, enrolledAt:now().toISOString(), lastSeen:null});
        return json(res, 201, {schema:'neo.guardian.enrollment.v1', endpointId:payload.endpointId, deviceToken, pairingCodeStored:false, adbPrivateKeyStored:false});
      }

      if (!validEndpointId(payload.endpointId)) return json(res, 400, {error:'invalid_endpoint_id'});
      const record = devices.get(payload.endpointId); const token = bearer(req);
      if (!record || !token || tokenHash(token) !== record.tokenHash) return json(res, 401, {error:'unauthorized'});

      if (url.pathname === '/v1/heartbeat') {
        record.lastSeen = now().toISOString();
        return json(res, 200, {ok:true, endpointId:payload.endpointId, receivedAt:record.lastSeen});
      }
      if (url.pathname === '/v1/posture') {
        record.lastSeen = now().toISOString();
        return json(res, 202, {accepted:true, endpointId:payload.endpointId, classification:'OBSERVATION_NOT_PROOF_OF_COMPROMISE'});
      }
      if (url.pathname === '/v1/events') {
        if (!payload.event || !ALLOWED_EVENT_SCHEMAS.has(payload.event.schema)) return json(res, 400, {error:'invalid_event_schema'});
        record.lastSeen = now().toISOString();
        return json(res, 202, {accepted:true, endpointId:payload.endpointId, toolAuthority:'NONE', consequentialAction:false});
      }
      return json(res, 404, {error:'not_found'});
    } catch (e) {
      return json(res, e.message === 'body_too_large' ? 413 : 400, {error:e.message === 'secret_material_refused' ? e.message : 'bad_request'});
    }
  });
}

if (process.argv[1] && import.meta.url === new URL(`file://${process.argv[1]}`).href) {
  const port = Number(process.env.PORT || 8080);
  createNeoGuardServer().listen(port, '0.0.0.0', () => console.log(`${SERVICE.name} listening on ${port}`));
}
