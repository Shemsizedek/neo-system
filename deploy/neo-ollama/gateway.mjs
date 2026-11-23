import http from 'node:http';
import { createHash, timingSafeEqual } from 'node:crypto';
import { createNeoRouter } from '../../server/neo-router/router.mjs';

const hash = value => createHash('sha256').update(value).digest();
function send(res, status, body) {
  res.writeHead(status, { 'content-type': 'application/json', 'cache-control': 'no-store', 'x-content-type-options': 'nosniff' });
  res.end(JSON.stringify(body));
}
async function readBody(req) {
  let size = 0;
  const chunks = [];
  for await (const chunk of req) {
    size += chunk.length;
    if (size > 16_384) throw new Error('body_limit');
    chunks.push(chunk);
  }
  return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}
export function createOllamaGateway({ token, model, adapter, modelDigest, version, now = Date.now } = {}) {
  if (typeof token !== 'string' || token.length < 32) throw new Error('strong_gateway_token_required');
  const expected = hash('Bearer ' + token);
  const router = createNeoRouter({ providers: [adapter] });
  let busy = false, lastStarted = -Infinity;
  const server = http.createServer(async (req, res) => {
    if (req.method === 'GET' && req.url === '/health') {
      return send(res, 200, { service: 'NEO Ollama', ready: true, model, modelDigest, version, cloudFallback: false });
    }
    if (!timingSafeEqual(hash(req.headers.authorization || ''), expected)) {
      req.resume();
      return send(res, 401, { error: 'authentication_required' });
    }
    if (req.method !== 'POST' || !['/api/chat', '/v1/missions'].includes(req.url)) {
      req.resume();
      return send(res, 404, { error: 'route_not_available' });
    }
    if (busy || now() - lastStarted < 1000) { req.resume(); return send(res, 429, { error: 'inference_busy' }); }
    busy = true;
    lastStarted = now();
    try {
      const body = await readBody(req);
      let mission;
      if (req.url === '/api/chat') {
        if (body.model !== model || body.stream !== false || !Array.isArray(body.messages) ||
            body.messages.length !== 2 || body.messages[0]?.role !== 'system' || body.messages[1]?.role !== 'user' ||
            typeof body.messages[0]?.content !== 'string' || typeof body.messages[1]?.content !== 'string') {
          throw new Error('request_invalid');
        }
        mission = { missionId: 'ollama-chat', capability: 'local-inference',
          system: body.messages[0].content, objective: body.messages[1].content,
          maxTokens: body.options?.num_predict ?? 128 };
      } else {
        if (body.capability !== 'local-inference' || typeof body.objective !== 'string') throw new Error('request_invalid');
        mission = { missionId: 'ollama-mission', capability: 'local-inference', objective: body.objective,
          maxTokens: body.maxTokens ?? 128, actions: Array.isArray(body.actions) ? body.actions.filter(x => typeof x === 'string') : [] };
      }
      if (!mission.objective.trim() || (mission.objective.length + (mission.system?.length || 0)) > 6000 ||
          !Number.isInteger(mission.maxTokens) || mission.maxTokens < 1 || mission.maxTokens > 512) throw new Error('request_invalid');
      const result = await router.execute(mission);
      if (result.status === 'awaiting_approval') return send(res, 403, { error: 'mission_action_requires_authorization' });
      if (result.status !== 'completed') return send(res, 502, { error: 'local_inference_failed' });
      if (req.url === '/api/chat') return send(res, 200, {
        model, created_at: new Date(now()).toISOString(), done: true,
        message: { role: 'assistant', content: result.result.text },
      });
      send(res, 200, { status: result.status, route: result.route, result: { model, text: result.result.text } });
    } catch (error) {
      send(res, ['request_invalid','body_limit'].includes(error.message) || error instanceof SyntaxError ? 400 : 502,
        { error: 'request_rejected' });
    } finally { busy = false; }
  });
  server.requestTimeout = 150_000;
  server.headersTimeout = 10_000;
  server.maxHeadersCount = 32;
  return server;
}
