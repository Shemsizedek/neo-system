import fs from 'node:fs';
import assert from 'node:assert/strict';
const config = JSON.parse(fs.readFileSync(new URL('./app.json', import.meta.url), 'utf8'));
const tests = [
  () => assert.equal(config.mcp_url, 'https://youspot.com/mcp'),
  () => assert.equal(config.transport, 'streamable-http'),
  () => assert.equal(config.oauth.issuer, 'https://youspot.com'),
  () => assert.equal(config.oauth.resource, config.mcp_url),
  () => assert.equal(config.oauth.pkce, 'S256'),
  () => assert.equal(config.oauth.grant_type, 'authorization_code'),
  () => assert.deepEqual(config.oauth.requested_scopes, ['integrations']),
  () => assert.equal(config.policy.default, 'deny'),
  () => assert.deepEqual(config.policy.allowed_tools, ['list_integrations']),
  () => assert.ok(config.policy.deny_scopes.includes('write')),
  () => assert.equal(config.policy.require_external_enforcement, true),
  () => assert.equal(config.policy.prohibit_tools_call_until_enforced, true),
  () => assert.equal(config.status, 'registration-template-not-connected')
];
for (const [i, test] of tests.entries()) { test(); console.log(`PASS ${i + 1}`); }
console.log(`Validated ${tests.length} registration/policy assertions; no network or OAuth call performed.`);
