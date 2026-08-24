import test from 'node:test'
import assert from 'node:assert/strict'

import { CONNECTOR_ACCESS, createConnectorRegistry } from './connectors.mjs'

test('prefers native connector for repository reads', () => {
  const registry = createConnectorRegistry()
  const plan = registry.plan({ platform: 'github', capability: 'repository_read' })

  assert.equal(plan.selected, 'github-native')
  assert.equal(plan.transport, 'native')
  assert.equal(plan.access, CONNECTOR_ACCESS.READ)
  assert.equal(plan.approvalRequired, false)
})

test('can explicitly prefer Airbyte for GitHub reads', () => {
  const registry = createConnectorRegistry()
  const plan = registry.plan({
    platform: 'github',
    capability: 'repository_read',
    preferredTransport: 'airbyte',
  })

  assert.equal(plan.selected, 'airbyte-github')
  assert.equal(plan.transport, 'airbyte')
})

test('requires approval for canonical merge', () => {
  const registry = createConnectorRegistry()
  const plan = registry.plan({ platform: 'github', capability: 'merge' })

  assert.equal(plan.selected, 'github-native')
  assert.equal(plan.access, CONNECTOR_ACCESS.HIGH_IMPACT)
  assert.equal(plan.approvalRequired, true)
})

test('requires approval for outbound Gmail and TikTok publication actions', () => {
  const registry = createConnectorRegistry()

  assert.equal(
    registry.plan({ platform: 'gmail', capability: 'message_send' }).approvalRequired,
    true,
  )
  assert.equal(
    registry.plan({ platform: 'tiktok-marketing', capability: 'campaign_write' }).approvalRequired,
    true,
  )
})

test('returns no selected connector for unsupported capability', () => {
  const registry = createConnectorRegistry()
  const plan = registry.plan({ platform: 'github', capability: 'financial_transfer' })

  assert.equal(plan.selected, null)
  assert.equal(plan.access, null)
  assert.equal(plan.approvalRequired, false)
})
