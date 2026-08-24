import { MISSION_STATUS } from './mission-engine.mjs'

const PRIORITY_WEIGHT=Object.freeze({critical:4,high:3,normal:2,low:1})

export function createLeaseManager({ clock = () => Date.now() } = {}) {
  const leases = new Map()
  return {
    mode:'memory',durable:false,
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

export function createWorkerRuntime({ engine, adapters = {}, workerId = 'neo-worker-1', role = 'general', capabilities = [], concurrency = 2, leaseManager = createLeaseManager(), leaseTtlMs = 60000, deadLetter = null } = {}) {
  if (!engine) throw new TypeError('engine is required')
  const active = new Set()
  const capabilitySet=new Set(capabilities)

  function canRun(mission){
    const required=mission.workerRole??mission.actions?.[0]?.workerRole??null
    if(required&&required!==role)return false
    const needed=mission.actions?.flatMap(a=>a.capabilities??[])??[]
    return needed.every(c=>capabilitySet.has(c))
  }

  function approvedFor(missionId, action){
    if(!action.approvalRequired)return true
    const actionKey=action.id??action.type??'high_impact_action'
    return engine.listApprovals().some(a=>a.missionId===missionId&&a.status==='approved'&&(a.context?.action?.id??a.action)===actionKey)
  }

  async function executeMission(mission) {
    if (!(await leaseManager.acquire(mission.id, workerId, leaseTtlMs))) return { missionId: mission.id, skipped: 'lease_unavailable' }
    active.add(mission.id)
    try {
      let current = engine.get(mission.id)
      if (current.status === MISSION_STATUS.QUEUED) current = engine.prepare(mission.id)
      if (current.status !== MISSION_STATUS.RUNNING) return { missionId: mission.id, skipped: current.status }

      const results = []
      for (const action of current.actions ?? []) {
        const actionKey=action.id??action.type??'high_impact_action'
        const approved=approvedFor(current.id,action)
        if (action.approvalRequired && !approved) {
          const existing=engine.listApprovals({status:'pending'}).find(a=>a.missionId===current.id&&(a.context?.action?.id??a.action)===actionKey)
          if(existing)return { missionId: current.id, awaitingApproval: existing.id, results }
          const approval = engine.requestApproval(current.id, actionKey, { action:{...action,id:actionKey}, workerId, role })
          return { missionId: current.id, awaitingApproval: approval.id, results }
        }
        const adapter = adapters[action.connector]
        if (!adapter) throw new Error(`No adapter registered for ${action.connector}`)
        results.push(await adapter(action, { mission: current, workerId, role, approved }))
      }
      engine.transition(current.id, MISSION_STATUS.COMPLETED, { result: results, workerId, role })
      return { missionId: current.id, completed: true, results }
    } catch (error) {
      const latest = engine.get(mission.id)
      if (latest?.status === MISSION_STATUS.RUNNING) {
        const next=engine.scheduleRetry(mission.id, error instanceof Error ? error.message : String(error))
        if(next.status===MISSION_STATUS.FAILED&&deadLetter)await deadLetter.push({mission:next,error:error instanceof Error?error.message:String(error),workerId,role})
      }
      return { missionId: mission.id, error: error instanceof Error ? error.message : String(error) }
    } finally {
      active.delete(mission.id)
      await leaseManager.release(mission.id, workerId)
    }
  }

  async function tick() {
    engine.releaseRetries()
    engine.refreshBlocked()
    const available = Math.max(0, concurrency - active.size)
    if (!available) return []
    const queue = engine.list({ status: MISSION_STATUS.QUEUED })
      .filter(canRun)
      .sort((a,b)=>(PRIORITY_WEIGHT[b.priority]??2)-(PRIORITY_WEIGHT[a.priority]??2)||Date.parse(a.createdAt)-Date.parse(b.createdAt))
      .slice(0, available)
    return Promise.all(queue.map(executeMission))
  }

  return Object.freeze({ tick, executeMission, workerId, role, capabilities:[...capabilitySet], leaseMode:leaseManager.mode??'custom', activeCount: () => active.size })
}
