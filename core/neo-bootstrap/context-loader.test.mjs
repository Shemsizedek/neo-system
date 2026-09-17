import test from 'node:test';
import assert from 'node:assert/strict';
import {
  loadNeoSystemBootstrap,
  parseRestrictedYaml,
  validateContext,
  validateRouter,
} from './context-loader.mjs';

test('restricted YAML parser handles NEO bootstrap structures', () => {
  const value = parseRestrictedYaml('version: "1.0"\nflags:\n  - alpha\n  - beta\ncontrols:\n  enabled: true\n');
  assert.equal(value.version, '1.0');
  assert.deepEqual(value.flags, ['alpha', 'beta']);
  assert.equal(value.controls.enabled, true);
});

test('context validation rejects non-additive architecture', () => {
  assert.throws(() => validateContext({
    schema: 'neo-system-ai-context',
    version: '1.0',
    system: { id: 'neo-system', architecture: 'replace' },
    controls: {
      preserveExisting: true,
      provenanceRequired: true,
      humanReviewRequired: true,
      fabricateMissingData: false,
    },
    epistemicStates: ['KNOWN', 'UNKNOWN', 'UNVERIFIED', 'DISPUTED', 'ASSESSED'],
    readinessDimensions: ['capability', 'capacity', 'readiness', 'deployment'],
    modules: ['neo-gas'],
  }), /architecture must remain additive/);
});

test('router validation rejects undeclared modules', () => {
  assert.throws(() => validateRouter({
    version: '1.0',
    id: 'neo-system-knowledge-router',
    routing: { defense_intelligence: ['unknown-module'] },
    cross_system: {
      preserve_source: true,
      preserve_provenance: true,
      preserve_uncertainty: true,
      preserve_conflicts: true,
      human_review: true,
    },
    rules: { conversation_to_fact: 'prohibited' },
  }, new Set(['neo-gas'])), /undeclared module/);
});

test('repository bootstrap loads and preserves authority boundaries', async () => {
  const loaded = await loadNeoSystemBootstrap({ rootDir: process.cwd() });
  assert.equal(loaded.context.system.id, 'neo-system');
  assert.equal(loaded.meta.humanReviewRequired, true);
  assert.equal(loaded.meta.autonomousOperationalAuthority, false);
  assert.equal(Object.isFrozen(loaded), true);
});
