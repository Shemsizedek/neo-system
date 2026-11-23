import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { setTimeout as delay } from 'node:timers/promises';
import { createOllamaAdapter } from '../../server/neo-router/ollama-provider.mjs';
import { createNeoRouter } from '../../server/neo-router/router.mjs';
import { createOllamaGateway } from './gateway.mjs';

const token = process.env.NEO_OLLAMA_GATEWAY_TOKEN;
if (!token || token.length < 32) throw new Error('NEO_OLLAMA_GATEWAY_TOKEN is required');
const model = process.env.OLLAMA_MODEL || 'qwen2.5:0.5b';
if (model !== 'qwen2.5:0.5b') throw new Error('Only the reviewed bootstrap model is enabled');
const local = 'http://127.0.0.1:11434';
const child = spawn('/bin/ollama', ['serve'], { stdio: 'inherit', env: {
  ...process.env, OLLAMA_HOST: '127.0.0.1:11434', OLLAMA_NO_CLOUD: '1',
  OLLAMA_CONTEXT_LENGTH: '2048', OLLAMA_NUM_PARALLEL: '1', OLLAMA_MAX_LOADED_MODELS: '1',
} });
let server;
let stopping = false;
function shutdown() {
  if (stopping) return;
  stopping = true;
  server?.close();
  child.kill('SIGTERM');
  setTimeout(() => process.exit(0), 5000).unref();
}
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
child.on('error', () => { console.error('neo_ollama_child_start_failed'); process.exit(1); });
child.on('exit', () => { if (!stopping) { server?.close(); process.exit(1); } });
try {
  let version;
  for (let attempt = 0; attempt < 90; attempt++) {
    try {
      const response = await fetch(local + '/api/version', { signal: AbortSignal.timeout(2000) });
      if (response.ok) { version = (await response.json()).version; break; }
    } catch {}
    await delay(1000);
  }
  if (!version) throw new Error('daemon_unavailable');
  console.log('neo_ollama_pulling_bootstrap_model');
  const pull = await fetch(local + '/api/pull', {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ model, stream: false }), signal: AbortSignal.timeout(600_000),
  });
  const pulled = await pull.json();
  if (!pull.ok || pulled.status !== 'success') throw new Error('model_pull_failed');
  const tags = await fetch(local + '/api/tags', { signal: AbortSignal.timeout(5000) }).then(r => r.json());
  const modelDigest = tags.models?.find(x => x.name === model)?.digest;
  if (!modelDigest || !/^[a-f0-9]{64}$/.test(modelDigest)) throw new Error('model_digest_missing');
  const adapter = createOllamaAdapter({ baseUrl: local, model, timeoutMs: 120_000 });
  const router = createNeoRouter({ providers: [adapter] });
  const proof = await router.execute({
    missionId: 'neo-ollama-startup-verification', capability: 'local-inference',
    objective: 'Reply with the words NEO Ollama is ready.', maxTokens: 24,
  });
  if (proof.status !== 'completed' || !proof.result.text.trim()) throw new Error('inference_failed');
  console.log(JSON.stringify({ event: 'neo_ollama_inference_verified', model, modelDigest, version,
    outputCharacters: proof.result.text.length,
    outputHash: createHash('sha256').update(proof.result.text).digest('hex'), cloudFallback: false }));
  server = createOllamaGateway({ token, model, adapter, modelDigest, version });
  server.listen(Number(process.env.PORT || 10000), '0.0.0.0', () => {
    console.log('neo_ollama_authenticated_gateway_ready');
  });
} catch {
  console.error('neo_ollama_bootstrap_failed');
  child.kill('SIGTERM');
  process.exit(1);
}
