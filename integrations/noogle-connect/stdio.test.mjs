import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { Readable, Writable } from 'node:stream';
import { handle, serve } from './stdio.mjs';
const req = (method, params = {}, id = 1) => ({ jsonrpc: '2.0', id, method, params });

test('stdio subprocess: initialize, discover, and invoke all prototype tools', async () => {
  const child = spawn(process.execPath, [new URL('./stdio.mjs', import.meta.url).pathname], { stdio: ['pipe','pipe','pipe'] });
  let out = '', err = '';
  child.stdout.on('data', part => { out += part; }); child.stderr.on('data', part => { err += part; });
  const exited = new Promise((resolve, reject) => { child.on('error', reject); child.on('exit', resolve); });
  child.stdin.end([
    req('initialize', { protocolVersion: '2025-03-26', capabilities: {}, clientInfo: { name: 'gate-test', version: '1' } }),
    { jsonrpc: '2.0', method: 'notifications/initialized' },
    req('tools/list', {}, 2), req('tools/call', { name: 'noogle_connect_overview' }, 3),
    req('tools/call', { name: 'noogle_connect_readiness' }, 4),
    req('tools/call', { name: 'noogle_connection_guide', arguments: { platform: 'phone' } }, 5)
  ].map(JSON.stringify).join('\n') + '\n');
  assert.equal(await exited, 0); assert.equal(err, '');
  const replies = out.trim().split('\n').map(JSON.parse);
  assert.equal(replies.length, 5); assert.equal(replies[0].result.protocolVersion, '2025-03-26');
  assert.equal(replies[1].result.tools.length, 3);
  assert.equal(replies[2].result.structuredContent.deviceEnrollmentEnabled, false);
  assert.equal(replies[3].result.structuredContent.issuerVerified, false);
  assert.equal(replies[3].result.structuredContent.liveProbePerformed, false);
  assert.equal(replies[4].result.structuredContent.connected, false);
});
test('reject identity injection, commands, unknown tools and unsupported platforms', async () => {
  for (const params of [
    { name: 'noogle_connect_readiness', arguments: { subject: 'victim', issuerVerified: true } },
    { name: 'noogle_connection_guide', arguments: { platform: 'phone', command: 'whoami' } },
    { name: 'noogle_connection_guide', arguments: { platform: '__proto__' } },
    { name: 'noogle_connection_guide', arguments: { platform: 'fridge' } },
    { name: 'execute_terminal', arguments: { command: 'whoami' } },
    { name: 'noogle_connect_overview', arguments: [] }
  ]) assert.equal((await handle(req('tools/call', params))).error.code, -32602);
});
test('all five platform guides report design only', async () => {
  for (const platform of ['phone','tablet','chromebook','desktop','terminal']) {
    const result = await handle(req('tools/call', { name: 'noogle_connection_guide', arguments: { platform } }));
    assert.equal(result.result.structuredContent.connected, false);
    assert.equal(result.result.structuredContent.mode, 'design-guidance');
  }
});
test('malformed JSON is isolated; notifications never produce replies', async () => {
  let text = '';
  const output = new Writable({ write(chunk, encoding, done) { text += chunk; done(); } });
  await serve(Readable.from(['{bad}\n', JSON.stringify({ jsonrpc: '2.0', method: 'notifications/initialized' }) + '\n', JSON.stringify(req('ping')) + '\n']), output);
  const replies = text.trim().split('\n').map(JSON.parse);
  assert.equal(replies.length, 2); assert.equal(replies[0].error.code, -32700); assert.deepEqual(replies[1].result, {});
});
test('bounds transport frames and rejects invalid JSON-RPC', async () => {
  await assert.rejects(serve(Readable.from(['a'.repeat(65537)]), new Writable({ write(c,e,d) { d(); } })), /too_large/);
  assert.equal((await handle([])).error.code, -32600);
  assert.equal((await handle(req('tools/call', null))).error.code, -32602);
  assert.equal((await handle(req('execute'))).error.code, -32601);
});
