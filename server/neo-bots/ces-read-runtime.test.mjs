import test from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { createCesReadServer } from './ces-read-server.mjs';
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
