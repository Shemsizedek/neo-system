import test from 'node:test';
import assert from 'node:assert/strict';
import { createCrawlQueue } from './queue.mjs';
import { fingerprintCrawlerEnvelope } from './persistence.mjs';
import { createCrawlerRouteEvent, CRAWLER_ROUTE_TARGETS } from './router-contract.mjs';

test('crawl queue retries then fails at configured limit', () => {
  const q=createCrawlQueue({maxAttempts:2}); const added=q.enqueue({url:'https://example.test'});
  assert.equal(q.claim().id,added.id); assert.equal(q.fail(added.id,new Error('x')).status,'QUEUED');
  q.claim(); assert.equal(q.fail(added.id,new Error('x')).status,'FAILED');
});
test('fingerprints preserve crawler content hashes', () => {
  const rows=fingerprintCrawlerEnvelope({generatedAt:'2026-01-01T00:00:00Z',result:{docs:[{id:'a',url:'https://example.test',contentHash:'abc',title:'A'}]}});
  assert.equal(rows[0].contentHash,'abc'); assert.equal(rows[0].canonicalUrl,'https://example.test');
});
test('router event keeps review-only governance boundary', () => {
  const event=createCrawlerRouteEvent({service:'NEO Crawler',version:'1.0.0',adapter:'public-source',provenanceRequired:true,classification:{legalAuthorityAutomatic:false,doctrineAutomatic:false,lmsPublicationAutomatic:false},result:{}});
  assert.equal(event.governance.legalAuthorityAutomatic,false);
  assert.ok(event.targets.includes(CRAWLER_ROUTE_TARGETS.EVIDENCE));
});
