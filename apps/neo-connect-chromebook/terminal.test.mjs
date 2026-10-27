import test from 'node:test';
import assert from 'node:assert/strict';
import { mountTerminal } from './terminal.mjs';
import { createAgent } from './agent.mjs';

const canonicalOrigin = 'https://connect.holytemples.org';
const token = 'a'.repeat(64);

function page(fetch, origin = canonicalOrigin) {
  const elements = new Map();
  for (const id of ['key', 'cmd', 'out', 'status', 'connect', 'disconnect', 'run', 'mode', 'ssh-settings', 'ssh-host', 'ssh-user', 'ssh-port']) {
    const handlers = new Map();
    elements.set(id, {
      value:'', textContent:'', disabled:false,
      addEventListener(name, handler) { handlers.set(name, handler); },
      click() { if (!this.disabled) return handlers.get('click')?.(); },
      handlers
    });
  }
  elements.get('mode').value = 'local';
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

function selectSsh(element, {host = 'my-server', user = '', port = ''} = {}) {
  element('mode').value = 'ssh';
  element('mode').handlers.get('change')();
  element('ssh-host').value = host;
  element('ssh-user').value = user;
  element('ssh-port').value = port;
}

test('SSH connection binds a server target and sends token and commands only to the local companion', async () => {
  const requests = [];
  const element = page(async (url, options) => { requests.push({url, options}); return success('/remote/home\n'); });
  selectSsh(element, {host:'server.example.test', user:'neo', port:'2222'});
  assert.equal(element('ssh-settings').hidden, false);
  element('key').value = token;
  await element('connect').click();
  assert.equal(requests[0].url, 'http://127.0.0.1:8766/ssh/command');
  assert.deepEqual(JSON.parse(requests[0].options.body), {hostAlias:'server.example.test', username:'neo', port:2222, command:'pwd'});
  assert.equal(requests[0].options.headers['x-neo-token'], token);
  assert.equal(element('mode').disabled, true);
  assert.equal(element('ssh-host').disabled, true);
  assert.equal(element('run').textContent, 'Run on SSH server');
  assert.match(element('status').textContent, /Connected over SSH to server.example.test/);
  element('ssh-host').value = 'different-server';
  element('cmd').value = 'whoami';
  await element('run').click();
  assert.deepEqual(JSON.parse(requests[1].options.body), {hostAlias:'server.example.test', username:'neo', port:2222, command:'whoami'});
  element('disconnect').click();
  assert.equal(element('ssh-host').disabled, false);
  assert.equal(element('run').disabled, true);
});

test('SSH aliases use local config defaults without sending empty username or port overrides', async () => {
  let body;
  const element = page(async (url, options) => { body = JSON.parse(options.body); return success(); });
  selectSsh(element);
  element('key').value = token;
  await element('connect').click();
  assert.deepEqual(body, {hostAlias:'my-server', command:'pwd'});
});

test('SSH target validation rejects service-account emails, options, and invalid ports before requesting access', async () => {
  let calls = 0;
  const element = page(async () => { calls++; return success(); });
  element('key').value = token;
  for (const host of ['', 'account@developer.gserviceaccount.com', '-oProxyCommand=bad', 'host;bad']) {
    selectSsh(element, {host});
    await element('connect').click();
    assert.match(element('status').textContent, /server hostname/);
  }
  selectSsh(element, {user:'user@server'});
  await element('connect').click();
  assert.match(element('status').textContent, /Linux SSH username/);
  for (const port of ['0', '65536', '22.5', '-1', 'x']) {
    selectSsh(element, {port});
    await element('connect').click();
    assert.match(element('status').textContent, /SSH port/);
  }
  assert.equal(calls, 0);
  assert.equal(element('run').disabled, true);
});

test('SSH failures explain companion updates, missing tools, timeouts, and host-key or login errors', async t => {
  for (const [name, response, message] of [
    ['old companion', () => Response.json({error:'not_found'}, {status:404}), /Update the Chromebook checkout/],
    ['missing OpenSSH', () => Response.json({error:'ssh_unavailable'}, {status:503}), /openssh-client/],
    ['timeout', () => Response.json({error:'ssh_timeout'}, {status:504}), /SSH connection or command timed out/],
    ['unknown host key', () => success('Host key verification failed.', 255), /verify the server host key/]
  ]) await t.test(name, async () => {
    const element = page(async () => response());
    selectSsh(element);
    element('key').value = token;
    await element('connect').click();
    assert.match(element('status').textContent, message);
    assert.equal(element('run').disabled, true);
    assert.equal(element('key').value, '');
    if (name === 'unknown host key') assert.match(element('out').textContent, /Host key verification failed/);
  });
});

test('SSH browser request reaches the authenticated companion adapter with no Render hop', async () => {
  const calls = [];
  const agent = createAgent({secret:token, ssh:{execute:async options => {
    calls.push(options);
    return {stdout:'/server/home\n', stderr:'', exitCode:0};
  }}});
  await new Promise(resolve => agent.listen(0, '127.0.0.1', resolve));
  try {
    const element = page((url, options) => {
      assert.equal(url, 'http://127.0.0.1:8766/ssh/command');
      return fetch('http://127.0.0.1:' + agent.address().port + '/ssh/command', {...options, headers:{...options.headers, origin:canonicalOrigin}});
    });
    selectSsh(element, {host:'server.example.test', user:'neo'});
    element('key').value = token;
    await element('connect').click();
    assert.deepEqual(calls, [{hostAlias:'server.example.test', username:'neo', command:'pwd'}]);
    assert.match(element('out').textContent, /\/server\/home/);
    assert.equal(element('run').disabled, false);
  } finally { await new Promise(resolve => agent.close(resolve)); }
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
