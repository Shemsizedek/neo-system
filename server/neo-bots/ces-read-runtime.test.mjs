import test from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { createCesReadServer } from './ces-read-server.mjs';
import http from 'node:http';
import { mountCesRuntime } from '../../deploy/ces-read-runtime/mount.mjs';
import { NMNI_TRADING_COLUMNS, parseNmniTradingReport, readNmniAdminReport } from './nmni-admin-reader.mjs';
import { normalizeTradingSnapshot, createCesSourceStore } from './ces-source-store.mjs';

const cells = values => '<tr>' + values.map(v => `<td>${v}</td>`).join('') + '</tr>';
const row = ['1', 'July 2016', '1', '100000000.00', '100000000.00', '7999999.82', '92000000.18', '100000000.00'];
const reportHtml = '<h1>Trading Statistics</h1><table>' + cells(NMNI_TRADING_COLUMNS) + cells(row) + '</table>';
const snapshot = () => parseNmniTradingReport(reportHtml, '2026-10-29T22:00:00.000Z');
const exchange = { exchangeId: 'NMNI', adminAccount: 'NMNI0000' };
const member = '<a href="rlogin.asp?action=login&amp;uid=NMNI0000&amp;pw=fixture-secret">Administrator Functions</a>';
const home = '<h1>Noocratic Open Market Nibiru Index Administration (NMNI)</h1><h2>Administration Index</h2>';

test('admin reader follows only the explicit transition and report, returning no transition secret', async () => {
  const calls = [];
  const result = await readNmniAdminReport({ exchange, request: async (path, options) => {
    calls.push([path, options.method]);
    if (path === '/memac.asp') return new Response(member);
    if (path.includes('/rlogin.asp')) return new Response('', { status: 302, headers: { location: '_admin/admain.asp' } });
    if (path.includes('/_admin/admain.asp')) return new Response(home);
    if (path === '/_admin/statstrading.asp') return new Response(reportHtml);
    throw new Error('unexpected route');
  } });
  assert.equal(result.proof.adminAuthenticated, true);
  assert.equal(result.snapshot.scrapedReport.monthlyRows.length, 1);
  assert.equal(calls.every(([, method]) => method === 'GET'), true);
  assert.doesNotMatch(JSON.stringify(result), /fixture-secret|pw=/);
});

test('admin reader rejects missing transitions and redirects outside the admin surface', async () => {
  await assert.rejects(() => readNmniAdminReport({ exchange, request: async () => new Response('member') }), /transition unavailable/);
  for (const location of ['https://evil.example/_admin/admain.asp', '/memac.asp']) {
    await assert.rejects(() => readNmniAdminReport({ exchange, request: async path => path === '/memac.asp' ? new Response(member) : new Response('', { status: 302, headers: { location } }) }), /redirect rejected/);
  }
});

test('admin reader verifies admin identity and heading before collecting', async () => {
  await assert.rejects(() => readNmniAdminReport({ exchange: { ...exchange, exchangeId: 'OTHER' }, request: async () => { throw new Error('must not request'); } }), /identity required/);
  await assert.rejects(() => readNmniAdminReport({ exchange, request: async path => new Response(path === '/memac.asp' ? member : 'login page') }), /proof missing/);
});

test('report parser verifies exact headers and source normalization preserves decimal strings', () => {
  assert.throws(() => parseNmniTradingReport(reportHtml.replace('<td>NEO</td>', '<td>USD</td>')), /could not be verified/);
  const input = snapshot();
  input.scrapedReport.monthlyRows[0][3] = '99999999999999999999.01';
  input.password = 'never-store';
  const record = normalizeTradingSnapshot(input);
  assert.equal(record.payload.monthlyRows[0][3], '99999999999999999999.01');
  assert.equal(record.payload.unit, 'NEO');
  assert.equal(record.payload.recordType, 'historical-trading-summary');
  assert.doesNotMatch(JSON.stringify(record), /never-store/);
  assert.equal(record.id, normalizeTradingSnapshot(input).id);
  input.scrapedReport.monthlyRows[0][3] = 'not an amount';
  assert.throws(() => normalizeTradingSnapshot(input), /invalid CES monthly row/);
});

test('source store inserts only into the dedicated import table and deduplicates', async () => {
  const ids = new Set(), calls = [];
  const store = createCesSourceStore({ query: async (sql, values) => {
    calls.push(sql);
    const inserted = !ids.has(values[0]); ids.add(values[0]);
    return { rows: inserted ? [{ id: values[0] }] : [] };
  } });
  assert.equal((await store.importSnapshot(snapshot())).imported, true);
  assert.equal((await store.importSnapshot(snapshot())).imported, false);
  assert.equal(calls.every(sql => sql.startsWith('INSERT INTO neo_ces_source_imports')), true);
  assert.doesNotMatch(calls.join(' '), /UPDATE|DELETE|neo_bank_accounts|neo_bank_entries/);
});

const token = 'fixture-control-token-'.repeat(3);
const env = { NEO_CES_RUNTIME_TOKEN: token, NEO_CES_NMNI_USERNAME: 'fixture', NEO_CES_NMNI_PASSWORD: 'fixture-password', NEO_CES_IMPORT_ENABLED: 'true' };
async function withServer(options, run) {
  const server = createCesReadServer(options); server.listen(0, '127.0.0.1'); await once(server, 'listening');
  try { await run('http://127.0.0.1:' + server.address().port); } finally { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); }
}
const headers = { authorization: 'Bearer ' + token };
const proof = { exchangeId: 'NMNI', memberAuthenticated: true, adminAuthenticated: true };
const store = { ping: async () => true, list: async () => [], importSnapshot: async input => ({ id: normalizeTradingSnapshot(input).id, rowCount: 1, imported: true }) };

test('runtime health is public but control endpoints and data require bearer authentication', async () => {
  await withServer({ env, store }, async base => {
    assert.equal((await fetch(base + '/health')).status, 200);
    assert.equal((await fetch(base + '/v1/status')).status, 401);
    assert.equal((await fetch(base + '/v1/imports')).status, 401);
    const status = await (await fetch(base + '/v1/status', { headers })).json();
    assert.equal(status.financialWritesEnabled, false);
    assert.doesNotMatch(JSON.stringify(status), /fixture-password|fixture-control-token/);
  });
});

test('credential-free runtime reports health while all control and import routes remain closed', async () => {
  await withServer({ env: {} }, async base => {
    const health = await (await fetch(base + '/health')).json();
    assert.equal(health.ok, true);
    assert.equal(health.database, false);
    for (const path of ['/v1/status', '/v1/imports', '/v1/collect-import', '/v1/auth/check']) {
      assert.equal((await fetch(base + path, { method: path.includes('check') || path.includes('collect') ? 'POST' : 'GET', headers })).status, 401);
    }
  });
});

test('runtime fails closed without CES credentials or administrator proof', async () => {
  await withServer({ env: { NEO_CES_RUNTIME_TOKEN: token, NEO_CES_IMPORT_ENABLED: 'true' }, store, reader: () => { throw new Error('must not read'); } }, async base => {
    assert.equal((await fetch(base + '/v1/collect-import', { method: 'POST', headers })).status, 503);
  });
  let imports = 0;
  await withServer({ env, store: { ...store, importSnapshot: async () => { imports++; } }, reader: async () => ({ proof: { ...proof, adminAuthenticated: false }, snapshot: snapshot() }) }, async base => {
    assert.equal((await fetch(base + '/v1/collect-import', { method: 'POST', headers })).status, 502);
    assert.equal(imports, 0);
  });
});

test('runtime imports after verified reads, and auth check never imports', async () => {
  let imports = 0;
  await withServer({ env, store: { ...store, importSnapshot: async value => { imports++; return store.importSnapshot(value); } }, reader: async () => ({ proof, snapshot: snapshot() }) }, async base => {
    assert.equal((await fetch(base + '/v1/auth/check', { method: 'POST', headers })).status, 200);
    assert.equal(imports, 0);
    const response = await fetch(base + '/v1/collect-import', { method: 'POST', headers });
    assert.equal(response.status, 200);
    assert.equal((await response.json()).import.rowCount, 1);
    assert.equal(imports, 1);
  });
});

test('runtime rejects browser origins, unknown actions and request bodies and redacts failures', async () => {
  await withServer({ env, store, reader: async () => { throw new Error('pw=secret&cookie=session'); } }, async base => {
    assert.equal((await fetch(base + '/v1/imports', { headers: { ...headers, origin: 'https://evil.example' } })).status, 403);
    assert.equal((await fetch(base + '/v1/transfer', { method: 'POST', headers })).status, 404);
    assert.equal((await fetch(base + '/v1/auth/check', { method: 'POST', headers, body: '{}' })).status, 400);
    const response = await fetch(base + '/v1/auth/check', { method: 'POST', headers });
    assert.equal(response.status, 502);
    assert.doesNotMatch(await response.text(), /secret|session/);
  });
});

test('runtime requires explicit import enablement even with valid credentials', async () => {
  await withServer({ env: { ...env, NEO_CES_IMPORT_ENABLED: '' }, store, reader: () => { throw new Error('must not read'); } }, async base => {
    assert.equal((await fetch(base + '/v1/collect-import', { method: 'POST', headers })).status, 403);
  });
});

test('live reader diagnostics identify failed steps without returning transport secrets', async () => {
  for (const [fetchImpl, expected] of [
    [async () => { throw new Error('https://example.test/?pw=transport-secret cookie=private'); }, { stage: 'login_page', reason: 'request_unavailable' }],
    [async () => new Response('', { status: 302, headers: { location: '/private?pw=transport-secret' } }), { stage: 'login_page', reason: 'login_contract_mismatch', httpStatus: 302 }],
    [async (url, options) => options?.method === 'POST'
      ? new Response('', { status: 302, headers: { location: '/denied?pw=transport-secret' } })
      : new Response('<form method="POST" action="/rlogin.asp"><input name="uid"><input type="password" name="passwd"></form>'),
    { stage: 'login_submit', reason: 'login-redirect-mismatch', httpStatus: 302 }],
  ]) {
    await withServer({ env, store, fetchImpl }, async base => {
      const response = await fetch(base + '/v1/auth/check', { method: 'POST', headers });
      assert.equal(response.status, 502);
      const body = await response.json();
      assert.deepEqual(body.diagnostic, expected);
      assert.doesNotMatch(JSON.stringify(body), /transport-secret|private|pw=|fixture-password|https:/);
    });
  }
});

test('debug mode defaults off and requires the exact true string', async () => {
  for (const flag of [undefined, 'false', '1', 'TRUE']) {
    const entries = [];
    await withServer({ env: { ...env, NEO_CES_DEBUG_ENABLED: flag }, store, logger: entry => entries.push(entry), fetchImpl: async () => new Response('', { status: 403 }) }, async base => {
      const status = await (await fetch(base + '/v1/status', { headers })).json();
      assert.equal(status.debugEnabled, false);
      assert.equal((await fetch(base + '/v1/auth/check', { method: 'POST', headers })).status, 502);
      assert.deepEqual(entries, []);
    });
  }
});

test('enabled debug traces a complete administrator check without exposing session material', async () => {
  const entries = [];
  const fetchImpl = async (url, options) => {
    const path = new URL(url).pathname;
    if (path === '/login.asp') return new Response('<form method="POST" action="/rlogin.asp"><input name="uid"><input type="password" name="passwd"></form>');
    if (path === '/rlogin.asp' && options.method === 'POST') return new Response('', { status: 302, headers: { location: '/memac.asp', 'set-cookie': 'session=private-cookie' } });
    if (path === '/memac.asp') return new Response('Noocratic Open Market Nibiru Index ' + member);
    if (path === '/rlogin.asp') return new Response('', { status: 302, headers: { location: '/_admin/admain.asp' } });
    if (path === '/_admin/admain.asp') return new Response(home);
    throw new Error('unexpected fixture route');
  };
  await withServer({ env: { ...env, NEO_CES_DEBUG_ENABLED: 'true', NEO_CES_IMPORT_ENABLED: 'false' }, store, logger: entry => entries.push(entry), fetchImpl }, async base => {
    assert.equal((await fetch(base + '/v1/status')).status, 401);
    assert.equal((await (await fetch(base + '/v1/status', { headers })).json()).debugEnabled, true);
    const result = await fetch(base + '/v1/auth/check', { method: 'POST', headers });
    assert.equal(result.status, 200);
    assert.equal((await result.json()).proof.adminAuthenticated, true);
    assert.equal((await fetch(base + '/v1/collect-import', { method: 'POST', headers })).status, 403);
  });
  assert.equal(entries[0].event, 'ces_debug_enabled');
  const requests = entries.filter(entry => entry.event === 'ces_request');
  assert.deepEqual(requests.map(entry => entry.stage), ['login_page', 'login_submit', 'member_page', 'member_page', 'admin_transition', 'admin_page']);
  assert.ok(requests.every(entry => Number.isInteger(entry.durationMs) && entry.durationMs >= 0));
  assert.doesNotMatch(JSON.stringify(entries), /fixture-secret|fixture-password|fixture-control-token|private-cookie|pw=|https:/);
});

test('debug failures remain redacted and a broken logger does not break the runtime', async () => {
  const entries = [];
  for (const logger of [entry => entries.push(entry), () => { throw new Error('logger failed'); }]) {
    await withServer({ env: { ...env, NEO_CES_DEBUG_ENABLED: 'true' }, store, logger, fetchImpl: async () => { throw new Error('https://example.test/?pw=transport-secret cookie=private'); } }, async base => {
      const result = await fetch(base + '/v1/auth/check', { method: 'POST', headers });
      assert.equal(result.status, 502);
      assert.doesNotMatch(await result.text(), /transport-secret|cookie=|https:/);
      assert.equal((await fetch(base + '/health')).status, 200);
    });
  }
  assert.ok(entries.some(entry => entry.event === 'ces_request_unavailable' && entry.stage === 'login_page'));
  assert.ok(entries.some(entry => entry.event === 'ces_read_failed' && entry.reason === 'request_unavailable'));
  assert.doesNotMatch(JSON.stringify(entries), /transport-secret|cookie=|https:/);
});

test('shared staging mount preserves primary routes and applies CES authentication under its prefix', async () => {
  const primary = http.createServer((req, res) => { res.writeHead(200, { 'content-type': 'application/json' }); res.end(JSON.stringify({ service: 'primary', path: req.url })); });
  const server = mountCesRuntime({ primary, ces: createCesReadServer({ env, store }) });
  server.listen(0, '127.0.0.1'); await once(server, 'listening');
  const base = 'http://127.0.0.1:' + server.address().port;
  try {
    assert.deepEqual(await (await fetch(base + '/health')).json(), { service: 'primary', path: '/health' });
    assert.equal((await (await fetch(base + '/ces/health')).json()).service, 'neo-ces-read-runtime');
    assert.equal((await fetch(base + '/ces/v1/imports')).status, 401);
    assert.equal((await fetch(base + '/ces/v1/status', { headers })).status, 200);
  } finally { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); }
});
