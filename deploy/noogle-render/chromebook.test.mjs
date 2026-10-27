import assert from 'node:assert/strict';
import test from 'node:test';
import { createStagingServer } from './server.mjs';

async function withServer(check) {
  const server = createStagingServer();
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  try {
    await check(`http://127.0.0.1:${server.address().port}`);
  } finally {
    await new Promise(resolve => server.close(resolve));
  }
}

test('Device Hub links to the Chromebook page with a canonical trailing slash', async () => {
  await withServer(async base => {
    const home = await fetch(`${base}/`);
    assert.equal(home.status, 200);
    assert.match(await home.text(), /href=["']\/chromebook\/["']/);

    const redirect = await fetch(`${base}/chromebook`, { redirect: 'manual' });
    assert.ok([301, 302, 307, 308].includes(redirect.status));
    assert.equal(redirect.headers.get('location'), '/chromebook/');
  });
});

test('Chromebook page serves token and command controls under a loopback-only connection policy', async () => {
  await withServer(async base => {
    const response = await fetch(`${base}/chromebook/`);
    assert.equal(response.status, 200);
    assert.match(response.headers.get('content-type'), /^text\/html\b/);
    assert.match(response.headers.get('cache-control'), /\bno-store\b/);
    assert.equal(response.headers.get('x-content-type-options'), 'nosniff');

    const directives = new Map(response.headers.get('content-security-policy').split(';')
      .map(part => part.trim().split(/\s+/)).filter(([name]) => name)
      .map(([name, ...values]) => [name, values]));
    assert.deepEqual(directives.get('default-src'), ["'none'"]);
    assert.deepEqual(directives.get('script-src'), ["'self'"]);
    assert.deepEqual(directives.get('style-src'), ["'unsafe-inline'"]);
    assert.deepEqual(directives.get('connect-src'), ['http://127.0.0.1:8766']);
    assert.deepEqual(directives.get('frame-ancestors'), ["'none'"]);
    assert.deepEqual(directives.get('form-action'), ["'none'"]);
    assert.deepEqual(directives.get('base-uri'), ["'none'"]);

    const html = await response.text();
    for (const id of ['key', 'connect', 'disconnect', 'cmd', 'run', 'out', 'status']) {
      assert.match(html, new RegExp(`id=["']${id}["']`));
    }
    assert.match(html, /<script\b[^>]*type=["']module["'][^>]*src=["'](?:\.\/|\/chromebook\/)?terminal\.mjs["']/);
    assert.doesNotMatch(html, /<script\b[^>]*>\s*[^<\s]/);
  });
});

test('Chromebook browser module is served as uncached JavaScript', async () => {
  await withServer(async base => {
    const response = await fetch(`${base}/chromebook/terminal.mjs`);
    assert.equal(response.status, 200);
    assert.match(response.headers.get('content-type'), /^(?:application|text)\/javascript\b/);
    assert.match(response.headers.get('cache-control'), /\bno-store\b/);
    assert.equal(response.headers.get('x-content-type-options'), 'nosniff');
    assert.ok((await response.text()).length > 0);
  });
});

test('Chromebook static routes reject requests that could send commands or credentials to Render', async () => {
  await withServer(async base => {
    for (const path of ['/chromebook', '/chromebook/', '/chromebook/terminal.mjs']) {
      for (const method of ['POST', 'PUT', 'DELETE']) {
        const response = await fetch(`${base}${path}`, {
          method,
          redirect: 'manual',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ command: 'pwd' })
        });
        assert.equal(response.status, 405, `${method} ${path}`);
      }
    }
  });
});

test('Chromebook UI does not enable server-side command or privileged endpoints', async () => {
  await withServer(async base => {
    for (const path of ['/connect', '/connect/session', '/connect/terminal', '/api/guardian/session', '/api/command']) {
      const response = await fetch(`${base}${path}`, {
        headers: { authorization: 'Bearer forged', 'x-neo-token': 'forged' }
      });
      assert.equal(response.status, 403, path);
      assert.equal((await response.json()).remote_terminal, false, path);
    }
    for (const method of ['GET', 'POST']) {
      const response = await fetch(`${base}/command`, { method });
      assert.equal(response.status, 404, `${method} /command`);
    }
    for (const path of ['/chromebook/agent.mjs', '/chromebook/README.md', '/chromebook/not-found']) {
      assert.equal((await fetch(`${base}${path}`)).status, 404, path);
    }
  });
});
