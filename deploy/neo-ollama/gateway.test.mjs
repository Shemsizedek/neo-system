import test from 'node:test';
import assert from 'node:assert/strict';
import { createOllamaGateway } from './gateway.mjs';
import { createOllamaAdapter } from '../../server/neo-router/ollama-provider.mjs';
const token = 'fixture-token-' + 'x'.repeat(40);
async function withGateway(fn, options = {}) {
  const server = createOllamaGateway({
    token, model: 'qwen2.5:0.5b', version: 'test', modelDigest: 'a'.repeat(64),
    adapter: { id: 'ollama', configured: true, invoke: async () => ({ text: 'NEO ready' }) },
    ...options,
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  try { await fn('http://127.0.0.1:' + server.address().port); }
  finally { await new Promise(resolve => server.close(resolve)); }
}
const payload = { model: 'qwen2.5:0.5b', stream: false,
  messages: [{ role: 'system', content: 'NEO' }, { role: 'user', content: 'hello' }],
  options: { num_predict: 24 } };
const post = (base, body, auth = token, path = '/api/chat') => fetch(base + path, {
  method: 'POST', headers: { 'content-type': 'application/json', ...(auth ? { authorization: 'Bearer ' + auth } : {}) },
  body: JSON.stringify(body),
});
test('gateway requires a strong configured token', () => {
  assert.throws(() => createOllamaGateway({ token: 'short' }), /token/);
});
test('health is public but inference and daemon management require authorization', async () => {
  await withGateway(async base => {
    assert.equal((await fetch(base + '/health')).status, 200);
    assert.equal((await post(base, payload, '')).status, 401);
    assert.equal((await post(base, payload, 'incorrect')).status, 401);
    assert.equal((await post(base, {}, token, '/api/pull')).status, 404);
  });
});
test('Ollama native contract is compatible with authenticated remote adapter', async () => {
  await withGateway(async base => {
    const remote = createOllamaAdapter({ baseUrl: base, model: 'qwen2.5:0.5b', apiKey: token });
    const result = await remote.invoke({ system: 'NEO', prompt: 'hello', maxTokens: 24 });
    assert.equal(result.text, 'NEO ready');
  });
});
test('gateway rejects model swapping, streaming and oversized generation', async () => {
  for (const body of [{ ...payload, model: 'other' }, { ...payload, stream: true },
    { ...payload, options: { num_predict: 4096 } },
    { ...payload, messages: [{ role: 'system', content: 'x' }, { role: 'user', content: 'x'.repeat(6001) }] }]) {
    await withGateway(async base => assert.equal((await post(base, body)).status, 400));
  }
});
test('NEO mission endpoint stays local and preserves action governance', async () => {
  await withGateway(async base => {
    const response = await post(base, { capability: 'local-inference', objective: 'hello', actions: ['transaction'] }, token, '/v1/missions');
    assert.equal(response.status, 403);
  });
  await withGateway(async base => {
    const result = await post(base, { capability: 'local-inference', objective: 'hello', maxTokens: 24 }, token, '/v1/missions').then(r => r.json());
    assert.equal(result.route, 'ollama');
    assert.equal(result.result.text, 'NEO ready');
  });
});
test('gateway limits concurrent inference', async () => {
  let release, started;
  const running = new Promise(resolve => { started = resolve; });
  await withGateway(async base => {
    const first = post(base, payload);
    await running;
    assert.equal((await post(base, payload)).status, 429);
    release();
    assert.equal((await first).status, 200);
  }, { adapter: { id: 'ollama', configured: true, invoke: () => new Promise(resolve => {
    release = () => resolve({ text: 'ok' }); started();
  }) } });
});
