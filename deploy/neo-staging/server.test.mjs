import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import http from 'node:http';
import { createStagingServer } from './server.mjs';

async function fixture(t, {build = true} = {}) {
  const root = await mkdtemp(join(tmpdir(), 'neo-staging-'));
  if (build) {
    await mkdir(join(root, 'assets'));
    await mkdir(join(root, 'api'));
    await writeFile(join(root, 'index.html'), '<!doctype html><body><div id="root"></div><script src="/assets/app.js"></script></body>');
    await writeFile(join(root, 'assets/app.js'), 'console.log("staging");');
    await writeFile(join(root, 'api/public.json'), '{"public":true}');
  }
  const server = createStagingServer({root, revision: 'test-revision'});
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(async () => {
    server.closeAllConnections();
    await new Promise(resolve => server.close(resolve));
    await rm(root, {recursive: true, force: true});
  });
  return {base: `http://127.0.0.1:${server.address().port}`, port: server.address().port};
}

test('ready health identifies revision and disconnected backends', async t => {
  const {base} = await fixture(t);
  const response = await fetch(base + '/healthz');
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), {
    ok: true, service: 'neo-system-staging', environment: 'staging', revision: 'test-revision',
    frontend: 'ready', backend: 'not_connected', writes: false
  });
});

test('health fails when the compiled app is absent', async t => {
  const {base} = await fixture(t, {build: false});
  assert.equal((await fetch(base + '/healthz')).status, 503);
});

test('pages and assets load with a staging notice and isolated browser requests', async t => {
  const {base} = await fixture(t);
  const page = await fetch(base + '/');
  assert.match(await page.text(), /NEO STAGING/);
  assert.match(page.headers.get('content-security-policy'), /connect-src 'self'/);
  assert.match(page.headers.get('content-security-policy'), /form-action 'none'/);
  assert.equal(page.headers.get('cache-control'), 'no-store');
  const script = await fetch(base + '/assets/app.js');
  assert.match(script.headers.get('content-type'), /javascript/);
  assert.match(await script.text(), /console/);
  const head = await fetch(base + '/', {method: 'HEAD'});
  assert.equal(head.status, 200);
  assert.equal(await head.text(), '');
});

test('deep UI routes fall back without concealing missing assets or APIs', async t => {
  const {base} = await fixture(t);
  assert.equal((await fetch(base + '/counsel', {headers: {accept: 'text/html'}})).status, 200);
  assert.equal((await fetch(base + '/assets/missing.js', {headers: {accept: 'text/html'}})).status, 404);
  const api = await fetch(base + '/api/private', {headers: {accept: 'text/html'}});
  assert.equal(api.status, 503);
  assert.equal((await api.json()).error, 'staging_backend_not_connected');
  assert.deepEqual(await (await fetch(base + '/api/public.json')).json(), {public: true});
});

test('all write methods fail even for existing static paths', async t => {
  const {base} = await fixture(t);
  for (const method of ['POST', 'PUT', 'PATCH', 'DELETE']) {
    const response = await fetch(base + '/api/public.json', {method});
    assert.equal(response.status, 405);
    assert.equal(response.headers.get('allow'), 'GET, HEAD');
  }
});

test('encoded traversal and hidden files cannot be served', async t => {
  const {port} = await fixture(t);
  for (const path of ['/..%2fsecret', '/%2eenv', '/assets/%5csecret', '/%00']) {
    const status = await new Promise((resolve, reject) => {
      http.get({host: '127.0.0.1', port, path}, response => {response.resume(); resolve(response.statusCode);}).on('error', reject);
    });
    assert.equal(status, 400);
  }
});
