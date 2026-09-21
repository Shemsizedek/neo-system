import assert from 'node:assert/strict';
import test from 'node:test';
import { createNeoEdgeServer } from './server.mjs';

async function withServer(run) {
  const server = createNeoEdgeServer();
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  try {
    const { port } = server.address();
    await run(`http://127.0.0.1:${port}`);
  } finally {
    await new Promise(resolve => server.close(resolve));
  }
}

test('serves the public WordPress bridge with safe asset headers', async () => withServer(async base => {
  const response = await fetch(`${base}/assets/neo-bridge.js`, { headers: { 'x-forwarded-host': 'neo.holytemples.org' } });
  assert.equal(response.status, 200);
  assert.match(response.headers.get('content-type'), /^text\/javascript/);
  assert.equal(response.headers.get('x-content-type-options'), 'nosniff');
  const source = await response.text();
  assert.match(source, /customElements\.define\('neo-temple-dashboard'/);
  assert.match(source, /Temple Executive Telemetry/);
}));

test('keeps unknown assets closed', async () => withServer(async base => {
  const response = await fetch(`${base}/assets/not-real.js`, { headers: { 'x-forwarded-host': 'neo.holytemples.org' } });
  assert.equal(response.status, 404);
}));

test('serves the modular NEO Temple Suite', async () => withServer(async base => {
  const response = await fetch(`${base}/assets/neo-suite.js`, { headers: { 'x-forwarded-host': 'neo.holytemples.org' } });
  assert.equal(response.status, 200);
  const source = await response.text();
  assert.match(source, /class NeoNoogleSearch/);
  assert.match(source, /class NeoNomniValue/);
  assert.match(source, /window\.NeoTempleSuite/);
}));


test('serves the NEOsync AI workspace asset', async () => withServer(async base => {
  const response = await fetch(`${base}/assets/neo-ai.js`, { headers: { 'x-forwarded-host': 'neo.holytemples.org' } });
  assert.equal(response.status, 200);
  const source = await response.text();
  assert.match(source, /NEOsync Threads/);
  assert.match(source, /\/api\/ai\/threads/);
  assert.match(source, /Personalization \(Muse\)/);
  assert.match(source, /data-thread-search/);
  assert.match(source, /data-pin-thread/);
  assert.match(source, /durableTelemetry/);
  assert.match(source, /Knowledge attachments/);
  assert.match(source, /Knowledge provenance/);
  assert.match(source, /Knowledge Browser/);
  assert.match(source, /data-knowledge-search/);
  assert.match(source, /api\/noogle\/search/);
  assert.match(source, /api\/library/);
}));

test('serves the full-screen NEOsync workspace with NEOpass runtime', async () => withServer(async base => {
  const redirect=await fetch(`${base}/neosync`,{headers:{'x-forwarded-host':'neo.holytemples.org'},redirect:'manual'});
  assert.equal(redirect.status,308); assert.equal(redirect.headers.get('location'),'/neosync/');
  const page=await fetch(`${base}/neosync/`,{headers:{'x-forwarded-host':'neo.holytemples.org'}});
  assert.equal(page.status,200); const html=await page.text();
  assert.match(html,/NEOsync Conversation Workspace/); assert.match(html,/\/assets\/neopass-runtime\.js/); assert.match(html,/neo-temple-ai/);
  const runtime=await fetch(`${base}/assets/neopass-runtime.js`,{headers:{'x-forwarded-host':'neo.holytemples.org'}});
  assert.equal(runtime.status,200); assert.match(await runtime.text(),/window\.NeoPass/);
}));


test('previews public library records for the Knowledge Browser', async () => withServer(async base => {
  const catalog = await fetch(`${base}/api/library`, { headers: { 'x-forwarded-host': 'neo.holytemples.org' } });
  assert.equal(catalog.status, 200);
  const records = (await catalog.json()).records;
  assert.ok(records.length > 0);
  const response = await fetch(`${base}/api/library/${encodeURIComponent(records[0].id)}`, { headers: { 'x-forwarded-host': 'neo.holytemples.org' } });
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.record.id, records[0].id);
  assert.equal(body.oracleClass, 'internal-record-context');
  assert.equal(body.accessClass, 'PUBLIC_WORLD_LIBRARY');
}));
