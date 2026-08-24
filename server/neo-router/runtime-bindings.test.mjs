import test from 'node:test'
import assert from 'node:assert/strict'
import { resolveRuntimeBindings, runtimeBindingHealth } from './runtime-bindings.mjs'

test('resolves connector IDs only from runtime environment', () => {
  const env = { AIRBYTE_GITHUB_CONNECTOR_ID: 'gh-live' }
  const bindings = resolveRuntimeBindings(env)
  assert.equal(bindings['airbyte-github'].connectorId, 'gh-live')
  assert.equal(bindings['airbyte-asana'].connectorId, null)
})

test('reports binding health without requiring secrets in source', () => {
  const health = runtimeBindingHealth({ AIRBYTE_GITHUB_CONNECTOR_ID: 'gh-live', AIRBYTE_ASANA_CONNECTOR_ID: 'asana-live' })
  assert.equal(health.bound, 2)
  assert.equal(health.total, 6)
  assert.ok(health.unbound.includes('AIRBYTE_GMAIL_CONNECTOR_ID'))
})
