import test from 'node:test';
import assert from 'node:assert/strict';
import { planCrawl4AIPrivateStaging } from './private-staging-plan.mjs';
const imageUrl = 'ghcr.io/example/crawl4ai-reviewed@sha256:' + 'a'.repeat(64);
test('missing or mutable image cannot generate a blueprint', () => {
  for (const value of [undefined, 'ghcr.io/example/crawl4ai:latest', 'https://user:secret@registry/image']) {
    const report = planCrawl4AIPrivateStaging({ imageUrl: value });
    assert.equal(report.status, 'BLOCKED');
    assert.equal(report.blueprint, undefined);
    assert.equal(JSON.stringify(report).includes('user:secret'), false);
  }
});
test('draft is private, pinned, secret-free and does not create infrastructure', () => {
  const report = planCrawl4AIPrivateStaging({ imageUrl });
  const service = report.blueprint.services[0];
  assert.equal(service.type, 'pserv');
  assert.equal(service.runtime, 'image');
  assert.equal(service.image.url, imageUrl);
  assert.equal(service.healthCheckPath, undefined);
  assert.equal(service.domains, undefined);
  assert.equal(service.envVars[0].generateValue, true);
  assert.equal(report.applied, false);
  assert.equal(report.productionReady, false);
});
test('rejects unreviewed plan and unknown region', () => {
  assert.equal(planCrawl4AIPrivateStaging({ imageUrl, plan: 'free' }).status, 'BLOCKED');
  assert.equal(planCrawl4AIPrivateStaging({ imageUrl, region: 'unknown' }).status, 'BLOCKED');
});
test('private runner and transport requirements remain explicit after rendering', () => {
  const report = planCrawl4AIPrivateStaging({ imageUrl });
  assert.equal(report.status, 'BLUEPRINT_DRAFT_REQUIRES_VALIDATION');
  assert.ok(report.prerequisites.some(x => x.includes('private-network runner')));
  assert.ok(report.prerequisites.some(x => x.includes('TLS')));
});
