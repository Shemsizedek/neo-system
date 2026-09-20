import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { JsonEsopStore } from './store.mjs';
import { buildAnnualStatement, buildParticipantCertificate } from './documents.mjs';
import { calculateAllocation, calculateVesting, reconcile } from '../../../modules/orange-esop/runtime.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.resolve(__dirname, '../public');
const json = (res, code, body) => { res.writeHead(code, {'content-type':'application/json; charset=utf-8'}); res.end(JSON.stringify(body)); };
const body = async req => { let raw=''; for await (const c of req) raw += c; return raw ? JSON.parse(raw) : {}; };

function requireRole(req, allowed) {
  const role = req.headers['x-neo-role'];
  if (!allowed.includes(role)) throw Object.assign(new Error('forbidden'), { statusCode: 403 });
  return role;
}

export function createOrangeEsopServer({ store = new JsonEsopStore() } = {}) {
  return http.createServer(async (req, res) => {
    try {
      const url = new URL(req.url, 'http://localhost');
      if (req.method === 'GET' && url.pathname === '/health') return json(res, 200, {service:'orange-esop', status:'ok'});

      if (req.method === 'GET' && url.pathname === '/api/esop/dashboard') {
        requireRole(req, ['WORLD_CHAPLAIN','ASSISTANT_GRAND_SHEIK','SECRETARY','TREASURER','PLAN_ADMINISTRATOR','ESOP_TRUSTEE','AUDITOR']);
        const data = await store.snapshot();
        return json(res, 200, {
          participants: Object.values(data.participants || {}),
          stewardshipEntries: (data.stewardship || []).length,
          reconciliation: data.reconciliation || null,
          auditCount: (data.audit || []).length
        });
      }

      if (req.method === 'GET' && url.pathname === '/api/esop/participants') {
        requireRole(req, ['WORLD_CHAPLAIN','ASSISTANT_GRAND_SHEIK','SECRETARY','TREASURER','PLAN_ADMINISTRATOR','ESOP_TRUSTEE','AUDITOR']);
        return json(res, 200, {items: await store.listParticipants()});
      }

      if (req.method === 'POST' && url.pathname === '/api/esop/participants') {
        requireRole(req, ['SECRETARY','PLAN_ADMINISTRATOR']);
        const input = await body(req);
        if (!/^NEO-PART-\d{4}-\d{4,}$/.test(input.participantId || '')) return json(res, 400, {error:'INVALID_PARTICIPANT_ID'});
        return json(res, 201, await store.upsertParticipant(input));
      }

      if (req.method === 'POST' && url.pathname === '/api/esop/stewardship') {
        requireRole(req, ['SECRETARY','PLAN_ADMINISTRATOR']);
        const input = await body(req);
        if (!input.participantId || !input.category || !input.activity) return json(res, 400, {error:'INVALID_STEWARDSHIP_ENTRY'});
        return json(res, 201, await store.addStewardship({...input, entryId: input.entryId || randomUUID(), recordedAt:new Date().toISOString()}));
      }

      if (req.method === 'POST' && url.pathname === '/api/esop/allocation/calculate') {
        requireRole(req, ['PLAN_ADMINISTRATOR','ESOP_TRUSTEE']);
        return json(res, 200, calculateAllocation(await body(req)));
      }

      if (req.method === 'POST' && url.pathname === '/api/esop/vesting/calculate') {
        requireRole(req, ['PLAN_ADMINISTRATOR','ESOP_TRUSTEE']);
        return json(res, 200, calculateVesting(await body(req)));
      }

      if (req.method === 'POST' && url.pathname === '/api/esop/reconcile') {
        requireRole(req, ['TREASURER','ESOP_TRUSTEE','PLAN_ADMINISTRATOR']);
        const result = reconcile(await body(req));
        await store.saveReconciliation({...result, at:new Date().toISOString()});
        return json(res, result.status === 'PASS' ? 200 : 409, result);
      }

      if (req.method === 'POST' && url.pathname === '/api/esop/certificate') {
        requireRole(req, ['SECRETARY','PLAN_ADMINISTRATOR','ESOP_TRUSTEE']);
        const input = await body(req);
        const participant = await store.getParticipant(input.participantId);
        if (!participant) return json(res, 404, {error:'PARTICIPANT_NOT_FOUND'});
        const certificate = buildParticipantCertificate({...input, participant});
        return json(res, 201, await store.saveCertificate(certificate));
      }

      if (req.method === 'POST' && url.pathname === '/api/esop/statement') {
        requireRole(req, ['SECRETARY','PLAN_ADMINISTRATOR']);
        const input = await body(req);
        const participant = await store.getParticipant(input.participantId);
        if (!participant) return json(res, 404, {error:'PARTICIPANT_NOT_FOUND'});
        const statement = buildAnnualStatement({...input, participant});
        return json(res, 201, await store.saveStatement(statement));
      }

      if (req.method === 'GET' && (url.pathname === '/' || url.pathname.startsWith('/assets/'))) {
        const target = url.pathname === '/' ? 'index.html' : url.pathname.slice('/assets/'.length);
        const file = path.resolve(publicDir, target);
        if (!file.startsWith(publicDir)) return json(res, 403, {error:'forbidden'});
        const data = await readFile(file);
        const type = file.endsWith('.css') ? 'text/css' : file.endsWith('.js') ? 'text/javascript' : 'text/html';
        res.writeHead(200, {'content-type':`${type}; charset=utf-8`}); return res.end(data);
      }
      json(res, 404, {error:'not_found'});
    } catch (error) {
      json(res, error.statusCode || 500, {error:error.message || 'internal_error'});
    }
  });
}

export function startOrangeEsopServer({port=Number(process.env.PORT||8794), store}={}) {
  const server=createOrangeEsopServer({store});
  server.listen(port,()=>console.log(`Orange ESOP listening on :${port}`));
  return server;
}
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) startOrangeEsopServer();
