import test from 'node:test';
import assert from 'node:assert/strict';
import { mountTerminal } from './terminal.mjs';
import { createAgent } from './agent.mjs';

const canonicalOrigin = 'https://connect.holytemples.org';
const token = 'a'.repeat(64);

function page(fetch, origin = canonicalOrigin) {
  const elements = new Map();
  for (const id of ['key', 'cmd', 'out', 'status', 'connect', 'disconnect', 'run']) {
    const handlers = new Map();
    elements.set(id, {
      value:'', textContent:'', disabled:false,
      addEventListener(name, handler) { handlers.set(name, handler); },
      click() { if (!this.disabled) return handlers.get('click')?.(); },
      handlers
    });
  }
  const document = {getElementById:id => elements.get(id)};
  mountTerminal({document, fetch, origin});
  return id => elements.get(id);
}

const success = (output = '/home/neo\n', code = 0) => Response.json({output, code});

test('connect explicitly authenticates, runs commands only on loopback, and disconnect forgets the token', async () => {
  const requests = [];
  const element = page(async (url, options) => {
    requests.push({url, options});
    return success(requests.length === 1 ? '/home/neo\n' : '<script>not HTML</script>\n');
  });
  assert.equal(requests.length, 0);
  assert.equal(element('run').disabled, true);
  element('key').value = ' ' + token + ' ';
  await element('connect').click();
  assert.equal(requests[0].url, 'http://127.0.0.1:8766/command');
  assert.equal(requests[0].options.headers['x-neo-token'], token);
  assert.equal(requests[0].options.credentials, 'omit');
  assert.equal(requests[0].options.redirect, 'error');
  assert.deepEqual(JSON.parse(requests[0].options.body), {command:'pwd'});
  assert.equal(element('key').value, '');
  assert.equal(element('run').disabled, false);
  assert.match(element('status').textContent, /^Connected/);
  assert.equal(element('out').textContent, '/home/neo\n\n[exit 0]');
  element('cmd').value = 'printf test';
  await element('run').click();
  assert.deepEqual(JSON.parse(requests[1].options.body), {command:'printf test'});
  assert.equal(element('out').textContent, '<script>not HTML</script>\n\n[exit 0]');
  element('disconnect').click();
  assert.equal(element('run').disabled, true);
  assert.equal(element('key').value, '');
  assert.equal(element('out').textContent, 'Disconnected.');
  await element('connect').click();
  assert.equal(requests.length, 2);
  assert.match(element('status').textContent, /64-character/);
});

test('the Render hostname cannot send a companion token or enable commands', async () => {
  let calls = 0;
  const element = page(async () => { calls++; return success(); }, 'https://noogle-connect-staging.onrender.com');
  element('key').value = token;
  await element('connect').click();
  assert.equal(calls, 0);
  assert.equal(element('key').disabled, true);
  assert.equal(element('run').disabled, true);
  assert.match(element('status').textContent, /https:\/\/connect.holytemples.org\/chromebook\//);
});

test('invalid or missing tokens never send a connection request', async () => {
  let calls = 0;
  const element = page(async () => { calls++; return success(); });
  for (const value of ['', 'password', 'a'.repeat(63), 'z'.repeat(64)]) {
    element('key').value = value;
    await element('connect').click();
    assert.match(element('status').textContent, /64-character/);
  }
  assert.equal(calls, 0);
});

test('connection failures leave command access disabled with actionable messages', async t => {
  const cases = [
    ['wrong token', () => Response.json({error:'authentication_required'}, {status:401}), /Token not accepted/],
    ['origin denied', () => Response.json({error:'origin_denied'}, {status:403}), /rejected this site/],
    ['network permission', () => { throw new TypeError('Failed to fetch'); }, /allow local-network access/],
    ['timeout', () => { throw new DOMException('Timed out', 'TimeoutError'); }, /Cannot reach/],
    ['malformed reply', () => Response.json({ok:true}), /Unexpected companion/],
    ['failed pwd', () => success('failed', 127), /connection check failed/]
  ];
  for (const [name, reply, message] of cases) await t.test(name, async () => {
    const element = page(async () => reply());
    element('key').value = token;
    await element('connect').click();
    assert.match(element('status').textContent, message);
    assert.equal(element('run').disabled, true);
    assert.equal(element('connect').disabled, false);
    assert.equal(element('key').value, '');
  });
});

test('disconnect aborts pending authentication and ignores a late successful response', async () => {
  let resolveRequest, signal;
  const element = page((url, options) => {
    signal = options.signal;
    return new Promise(resolve => { resolveRequest = resolve; });
  });
  element('key').value = token;
  const pending = element('connect').click();
  assert.equal(element('disconnect').disabled, false);
  assert.equal(element('run').disabled, true);
  element('disconnect').click();
  assert.equal(signal.aborted, true);
  resolveRequest(success());
  await pending;
  assert.equal(element('run').disabled, true);
  assert.equal(element('out').textContent, 'Disconnected.');
  assert.match(element('status').textContent, /^Disconnected/);
});

test('empty and oversized commands are blocked, while nonzero command exits remain visible', async () => {
  let calls = 0;
  const element = page(async () => { calls++; return calls === 1 ? success() : success('not found', 1); });
  element('key').value = token;
  await element('connect').click();
  for (const value of ['', ' '.repeat(10), 'x'.repeat(513)]) {
    element('cmd').value = value;
    await element('run').click();
  }
  assert.equal(calls, 1);
  element('cmd').value = 'false';
  await element('run').click();
  assert.equal(element('out').textContent, 'not found\n[exit 1]');
  assert.equal(element('run').disabled, false);
});

test('browser client authenticates against the real companion without a command proxy', async () => {
  const agent = createAgent({secret:token});
  await new Promise(resolve => agent.listen(0, '127.0.0.1', resolve));
  const requests = [];
  try {
    const localUrl = 'http://127.0.0.1:' + agent.address().port + '/command';
    const element = page(async (url, options) => {
      requests.push(url);
      return fetch(localUrl, {...options, headers:{...options.headers, origin:canonicalOrigin}});
    });
    element('key').value = 'b'.repeat(64);
    await element('connect').click();
    assert.match(element('status').textContent, /Token not accepted/);
    element('key').value = token;
    await element('connect').click();
    assert.match(element('status').textContent, /^Connected/);
    assert.match(element('out').textContent, /\[exit 0\]/);
    element('cmd').value = 'printf companion-connected';
    await element('run').click();
    assert.equal(element('out').textContent, 'companion-connected\n[exit 0]');
    assert.ok(requests.every(url => url === 'http://127.0.0.1:8766/command'));
  } finally { await new Promise(resolve => agent.close(resolve)); }
});
