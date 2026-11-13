import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createServer } from 'node:net';
import { once } from 'node:events';

async function availablePort() {
  const listener = createServer();
  listener.listen(0, '127.0.0.1');
  await once(listener, 'listening');
  const port = listener.address().port;
  await new Promise((resolve, reject) => listener.close(error => error ? reject(error) : resolve()));
  return port;
}
async function getWithRetry(url, child) {
  let lastError;
  for (let attempt = 0; attempt < 40; attempt++) {
    if (child.exitCode !== null) throw new Error('NEO Pads frontend terminated before smoke test');
    try {
      const response = await fetch(url, {signal: AbortSignal.timeout(1000)});
      return response;
    } catch (error) {
      lastError = error;
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }
  throw lastError ?? new Error('frontend did not respond');
}
test('G045: existing NEO Pads frontend serves safe Civitas preview', {timeout: 12000}, async () => {
  const port = await availablePort();
  const child = spawn(process.execPath, [new URL('./server.mjs', import.meta.url).pathname], {
    env: {...process.env, PORT: String(port)}, stdio: 'ignore'
  });
  try {
    const origin = 'http://127.0.0.1:' + port;
    const page = await getWithRetry(origin + '/civitas/index.html', child);
    assert.equal(page.status, 200);
    assert.match(page.headers.get('content-type') ?? '', /text\/html/);
    const body = await page.text();
    assert.match(body, /NEO PADS \/ CIVITAS/);
    assert.match(body, /Concept preview/);
    assert.match(body, /not deed ownership/);
    assert.match(body, /donations, and deed transfers are disabled/);
    assert.doesNotMatch(body, /<form\b/i);
    const health = await fetch(origin + '/healthz');
    assert.equal(health.status, 200);
    const missing = await fetch(origin + '/civitas/nonexistent.html');
    assert.equal(missing.status, 404);
  } finally {
    child.kill('SIGTERM');
  }
});
