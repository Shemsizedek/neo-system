import test from 'node:test'
import assert from 'node:assert/strict'
import { createMissionEngine, MISSION_STATUS } from './mission-engine.mjs'

function deterministicEngine() {
  let tick = 0
  let id = 0
  return createMissionEngine({
    clock: () => `2026-08-24T01:3${tick++}:00.000Z`,
    idFactory: () => String(++id).padStart(4, '0'),
  })
}

test('queues and completes a mission with auditable transitions', () => {
  const engine = deterministicEngine()
  const mission = engine.queue({ id: 'NEO-MISSION-001', objective: 'Inspect repository', route: ['github-native'] })
  assert.equal(mission.status, MISSION_STATUS.QUEUED)
  engine.transition(mission.id, MISSION_STATUS.RUNNING)
  engine.transition(mission.id, MISSION_STATUS.COMPLETED, { result: { ok: true } })
  const telemetry = engine.telemetry()
  assert.equal(telemetry.summary.total, 1)
  assert.equal(telemetry.summary.terminal, 1)
  assert.equal(telemetry.missions[0].result.ok, true)
  assert.ok(telemetry.events.some((event) => event.type === 'mission.transition'))
})

test('approval gate pauses and resumes an active mission', () => {
  const engine = deterministicEngine()
  const mission = engine.queue({ id: 'NEO-MISSION-002', objective: 'Merge approved PR' })
  engine.transition(mission.id, MISSION_STATUS.RUNNING)
  const approval = engine.requestApproval(mission.id, 'canonical_write', { pr: 100 })
  assert.equal(engine.get(mission.id).status, MISSION_STATUS.AWAITING_APPROVAL)
  assert.equal(engine.telemetry().summary.pendingApprovals, 1)
  engine.decideApproval(approval.id, 'approved', 'NEO')
  assert.equal(engine.get(mission.id).status, MISSION_STATUS.RUNNING)
  assert.equal(engine.listApprovals({ status: 'pending' }).length, 0)
})

test('rejected approval cancels mission', () => {
  const engine = deterministicEngine()
  const mission = engine.queue({ id: 'NEO-MISSION-003', objective: 'Publish external content' })
  engine.transition(mission.id, MISSION_STATUS.RUNNING)
  const approval = engine.requestApproval(mission.id, 'publication')
  engine.decideApproval(approval.id, 'rejected', 'NEO')
  assert.equal(engine.get(mission.id).status, MISSION_STATUS.CANCELLED)
})

test('rejects invalid transitions and duplicate approval decisions', () => {
  const engine = deterministicEngine()
  const mission = engine.queue({ id: 'NEO-MISSION-004', objective: 'Test controls' })
  assert.throws(() => engine.transition(mission.id, MISSION_STATUS.COMPLETED), /Invalid mission transition/)
  engine.transition(mission.id, MISSION_STATUS.RUNNING)
  const approval = engine.requestApproval(mission.id, 'production_deployment')
  engine.decideApproval(approval.id, 'approved')
  assert.throws(() => engine.decideApproval(approval.id, 'approved'), /already decided/)
})

test('records connector heartbeat telemetry', () => {
  const engine = deterministicEngine()
  engine.heartbeat('github-native', 'healthy', { latencyMs: 120 })
  engine.heartbeat('airbyte-github', 'degraded', { reason: 'schema_discovery_error' })
  const telemetry = engine.telemetry()
  assert.equal(telemetry.connectors.length, 2)
  assert.equal(telemetry.connectors.find((c) => c.connectorId === 'airbyte-github').state, 'degraded')
})
