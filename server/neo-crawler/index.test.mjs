import test from 'node:test';
import assert from 'node:assert/strict';
import { createNeoCrawler, NEO_CRAWLER_VERSION } from './index.mjs';

test('reports unified NEO Crawler capabilities and boundaries', () => {
  const crawler = createNeoCrawler({
    adapters: {
      fixture: async () => ({ ok: true })
    }
  });

  const caps = crawler.capabilities();
  assert.equal(caps.service, 'NEO Crawler');
  assert.equal(caps.version, NEO_CRAWLER_VERSION);
  assert.deepEqual(caps.builtIns, ['public-source', 'domain']);
  assert.deepEqual(caps.adapters, ['fixture']);
  assert.equal(caps.boundaries.publicHttpOnly, true);
  assert.equal(caps.boundaries.bypassAuthentication, false);
  assert.ok(caps.downstream.includes('NEO Algo'));
  assert.ok(caps.downstream.includes('NEO Law'));
});

test('wraps adapter output with provenance and publication governance', async () => {
  const crawler = createNeoCrawler();
  crawler.register('fixture', async input => ({ id: input.id, evidenceState: 'unverified' }));

  const output = await crawler.crawl({ adapter: 'fixture', id: 'neo-001' });
  assert.equal(output.service, 'NEO Crawler');
  assert.equal(output.adapter, 'fixture');
  assert.equal(output.provenanceRequired, true);
  assert.equal(output.classification.legalAuthorityAutomatic, false);
  assert.equal(output.classification.doctrineAutomatic, false);
  assert.equal(output.result.id, 'neo-001');
});

test('rejects unknown adapters', async () => {
  const crawler = createNeoCrawler();
  await assert.rejects(() => crawler.crawl({ adapter: 'missing' }), /Unknown NEO Crawler adapter/);
});
