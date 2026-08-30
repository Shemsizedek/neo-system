import test from 'node:test';
import assert from 'node:assert/strict';
import { TeraBoxAdapter } from './adapter.mjs';

function mockFetch(payload = { errno: 0 }) {
  const calls = [];
  const fetchImpl = async (url, options = {}) => {
    calls.push({ url, options });
    return {
      ok: true,
      status: 200,
      async text() { return JSON.stringify(payload); },
    };
  };
  return { fetchImpl, calls };
}

test('list sends token and directory parameters', async () => {
  const { fetchImpl, calls } = mockFetch({ errno: 0, list: [] });
  const adapter = new TeraBoxAdapter({ accessToken: 'test-token', fetchImpl });
  await adapter.list({ dir: '/From: Other Applications/NEO System-123/' });
  assert.equal(calls.length, 1);
  const url = new URL(calls[0].url);
  assert.equal(url.pathname, '/openapi/api/list');
  assert.equal(url.searchParams.get('access_tokens'), 'test-token');
  assert.equal(url.searchParams.get('page'), '1');
  assert.equal(url.searchParams.get('num'), '100');
});

test('downloadLinks rejects an empty fid list', async () => {
  const { fetchImpl } = mockFetch();
  const adapter = new TeraBoxAdapter({ accessToken: 'test-token', fetchImpl });
  await assert.rejects(() => adapter.downloadLinks([]), /non-empty array/);
});

test('TeraBox errno becomes an exception', async () => {
  const { fetchImpl } = mockFetch({ errno: -9, show_msg: 'File not found' });
  const adapter = new TeraBoxAdapter({ accessToken: 'test-token', fetchImpl });
  await assert.rejects(() => adapter.quota(), /File not found/);
});
