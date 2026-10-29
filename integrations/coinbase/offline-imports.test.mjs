import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile, readdir} from 'node:fs/promises';

// Explicit default-deny dependency inventory for executable Coinbase adapters.
// Documentation and tests are excluded, because they never ship in the gateway.
test('coinbase adapter runtime remains offline and cannot import SDKs or transports', async () => {
  const root = new URL('./', import.meta.url);
  const filenames = (await readdir(root)).filter(name => name.endsWith('.mjs') && !name.endsWith('.test.mjs'));
  assert.deepEqual(filenames.sort(), ['boundary.mjs', 'local-gateway.mjs', 'sandbox.mjs']);
  const allowed = {
    'boundary.mjs': new Set([]),
    'sandbox.mjs': new Set(['./boundary.mjs']),
    'local-gateway.mjs': new Set(['node:http','node:crypto','./sandbox.mjs']),
  };
  for (const name of filenames) {
    const source = await readFile(new URL(name, root), 'utf8');
    const imports = [...source.matchAll(/\bfrom\s*['"]([^'"]+)['"]/g)].map(match => match[1]);
    assert.deepEqual(new Set(imports), allowed[name], name + ': unapproved dependencies');
    assert.doesNotMatch(source, /\bimport\s*\(|\brequire\s*\(|\bfetch\s*\(|\bWebSocket\s*\(|\bhttps?\.request\s*\(|\bprocess\.env\b|\bchild_process\b|\bnode:net\b|\bnode:tls\b|\bnode:dns\b|\beval\s*\(/, name + ': external runtime capability forbidden');
  }
});
