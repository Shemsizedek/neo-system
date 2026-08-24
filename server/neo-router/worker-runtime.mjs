import { MISSION_STATUS } from './mission-engine.mjs'

export function createLeaseManager({ clock = () => Date.now() } = {}) {
  const leases = new Map()
  return {
    acquire(key, owner, ttlMs = 60000) {
      const now = clock()
      const current = leases.get(key)
      if (current && current.expiresAt > now && current.owner !== owner) return false
      leases.set(key, { owner, expiresAt: now + ttlMs })
      return true
    },
    release(key, owner) {
      const current = leases.get(key)
      if (!current || current.owner !== owner) return false
      leases.delete(key)
      return true
    },
    inspect(key) { return leases.get(key) ?? null },
  }
}

export function createWorkerRuntime({ engine, adapters = {}, workerId = 'neo-worker-1', concurrency = 2, leaseManager = createLeaseManager(), leaseTtlMs = 60000 } = {}) {
  if (!engine) throw new TypeError('engine is required')
  const active = new Set()

  async function executeMission(mission) {
    if (!leaseManager.acquire(mission.id, workerId, leaseTtlMs)) return { missionId: mission.id, skipped: 'lease_unavailable' }
    active.add(mission.id)
    try {
      let current = engine.get(mission.id)
      if (current.status === MISSION_STATUS.QUEUED) current = engine.prepare(mission.id)
      if (current.status !== MISSION_STATUS.RUNNING) return { missionId: mission.id, skipped: current.status }

      const results = []
      for (const action of current.actions ?? []) {
        if (action.approvalRequired) {
          const approval = engine.requestApproval(current.id, action.type ?? 'high_impact_action', { action })
          return { missionId: current.id, awaitingApproval: approval.id, results }
        }
        const adapter = adapters[action.connector]
        if (!adapter) throw new Error(`No adapter registered for ${action.connector}`)
        results.push(await adapter(action, { mission: current, workerId }))
      }
      engine.transition(current.id, MISSION_STATUS.COMPLETED, { result: results })
      return { missionId: current.id, completed: true, results }
    } catch (error) {
      const latest = engine.get(mission.id)
      if (latest?.status === MISSION_STATUS.RUNNING) engine.scheduleRetry(mission.id, error instanceof Error ? error.message : String(error))
      return { missionId: mission.id, error: error instanceof Error ? error.message : String(error) }
    } finally {
      active.delete(mission.id)
      leaseManager.release(mission.id, workerId)
    }
  }

  async function tick() {
    engine.releaseRetries()
    engine.refreshBlocked()
    const available = Math.max(0, concurrency - active.size)
    if (!available) return []
    const queue = engine.list({ status: MISSION_STATUS.QUEUED }).slice(0, available)
    return Promise.all(queue.map(executeMission))
  }

  return Object.freeze({ tick, executeMission, workerId, activeCount: () => active.size })
}
