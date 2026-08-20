import test from 'node:test';
import assert from 'node:assert/strict';
import { loadSystem, originBanner } from '../packages/core/index.js';
import { listProjects, getProject } from '../packages/registry/index.js';

test('system config identifies ORIGIN', () => {
  const system = loadSystem();
  assert.equal(system.system, 'NEO SYSTEMS');
  assert.equal(system.codename, 'ORIGIN');
  assert.equal(system.divisions.length, 10);
});

test('origin banner is versioned', () => {
  assert.match(originBanner(), /^NEO SYSTEMS — ORIGIN v/);
});

test('project registry is queryable', () => {
  assert.ok(listProjects().length >= 5);
  assert.equal(getProject('neopay')?.name, 'NEOpay');
  assert.equal(getProject('missing'), null);
});
