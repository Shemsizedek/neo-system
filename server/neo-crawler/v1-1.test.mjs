import test from 'node:test';
import assert from 'node:assert/strict';
import { createCrawlQueue } from './queue.mjs';
import { fingerprintCrawlerEnvelope, createEvidenceVaultSink } from './persistence.mjs';
import { createCrawlerRouteEvent, CRAWLER_ROUTE_TARGETS } from './router-contract.mjs';

test('crawl queue retries then fails at configured limit', () => {
  const q=createCrawlQueue({maxAttempts:2}); const added=q.enqueue({url:'https://example.test'});
  const first=q.claim(); assert.equal(first.id,added.id); assert.equal(q.fail(added.id,new Error('x'),first.claimToken).status,'QUEUED');
  const second=q.claim(); assert.equal(q.fail(added.id,new Error('x'),second.claimToken).status,'FAILED');
});
test('queue snapshots input and rejects terminal failure callbacks', () => {
  const input={url:'https://example.test'}; const q=createCrawlQueue(); q.enqueue(input); input.url='https://changed.test';
  const claimed=q.claim(); assert.equal(claimed.input.url,'https://example.test'); q.complete(claimed.id,{ok:true},claimed.claimToken);
  assert.throws(()=>q.fail(claimed.id,new Error('late'),claimed.claimToken),/crawl_job_not_running/);
});
test('fingerprints preserve crawler content hashes', () => {
  const rows=fingerprintCrawlerEnvelope({generatedAt:'2026-01-01T00:00:00Z',result:{docs:[{id:'a',url:'https://example.test',contentHash:'abc',title:'A'}]}});
  assert.equal(rows[0].contentHash,'abc'); assert.equal(rows[0].canonicalUrl,'https://example.test');
});
test('evidence sink is retry-safe', () => {
  const rows=new Map(); const vault={getEvidence:id=>rows.get(id)||null,createEvidence:r=>(rows.set(r.id,{...r,reviewStatus:'UNREVIEWED'}),rows.get(r.id))};
  const sink=createEvidenceVaultSink(vault); const env={adapter:'public-source',generatedAt:'2026-01-01T00:00:00Z',result:{id:'a',url:'https://example.test',contentHash:'abc',title:'A'}};
  const first=sink.persist(env)[0], second=sink.persist(env)[0]; assert.equal(first.id,second.id); assert.equal(rows.size,1);
});
test('router event uses scalar source and keeps review-only governance boundary', () => {
  const event=createCrawlerRouteEvent({service:'NEO Crawler',version:'1.1.0',adapter:'public-source',provenanceRequired:true,classification:{legalAuthorityAutomatic:false,doctrineAutomatic:false,lmsPublicationAutomatic:false},result:{}});
  assert.equal(event.source,'neo-crawler'); assert.equal(event.sourceMeta.adapter,'public-source');
  assert.equal(event.governance.legalAuthorityAutomatic,false); assert.ok(event.targets.includes(CRAWLER_ROUTE_TARGETS.EVIDENCE));
});
