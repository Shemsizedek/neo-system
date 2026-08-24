import { randomUUID } from 'node:crypto'

export const MISSION_STATUS = Object.freeze({
  QUEUED: 'queued',
  RUNNING: 'running',
  AWAITING_APPROVAL: 'awaiting_approval',
  COMPLETED: 'completed',
  FAILED: 'failed',
  CANCELLED: 'cancelled',
})

const TERMINAL = new Set([MISSION_STATUS.COMPLETED, MISSION_STATUS.FAILED, MISSION_STATUS.CANCELLED])
const ALLOWED = Object.freeze({
  [MISSION_STATUS.QUEUED]: new Set([MISSION_STATUS.RUNNING, MISSION_STATUS.CANCELLED]),
  [MISSION_STATUS.RUNNING]: new Set([MISSION_STATUS.AWAITING_APPROVAL, MISSION_STATUS.COMPLETED, MISSION_STATUS.FAILED, MISSION_STATUS.CANCELLED]),
  [MISSION_STATUS.AWAITING_APPROVAL]: new Set([MISSION_STATUS.RUNNING, MISSION_STATUS.CANCELLED]),
  [MISSION_STATUS.COMPLETED]: new Set(),
  [MISSION_STATUS.FAILED]: new Set(),
  [MISSION_STATUS.CANCELLED]: new Set(),
})

function now() { return new Date().toISOString() }
function clone(value) { return structuredClone(value) }

export function createMissionEngine({ clock = now, idFactory = randomUUID } = {}) {
  const missions = new Map()
  const events = []
  const approvals = new Map()
  const connectorHealth = new Map()

  function emit(type, missionId, detail = {}) {
    const event = { id: idFactory(), type, missionId: missionId ?? null, timestamp: clock(), detail: clone(detail) }
    events.unshift(event)
    return event
  }

  function queue(input) {
    if (!input?.objective) throw new TypeError('objective is required')
    const id = input.id ?? `NEO-MISSION-${idFactory()}`
    if (missions.has(id)) throw new Error(`Mission already exists: ${id}`)
    const mission = {
      id,
      objective: input.objective,
      priority: input.priority ?? 'normal',
      status: MISSION_STATUS.QUEUED,
      route: input.route ?? [],
      actions: input.actions ?? [],
      provenance: input.provenance ?? [],
      createdAt: clock(),
      updatedAt: clock(),
      result: null,
      error: null,
    }
    missions.set(id, mission)
    emit('mission.queued', id, { priority: mission.priority, route: mission.route })
    return clone(mission)
  }

  function get(id) {
    const mission = missions.get(id)
    return mission ? clone(mission) : null
  }

  function list({ status } = {}) {
    return [...missions.values()].filter((m) => !status || m.status === status).map(clone)
  }

  function transition(id, nextStatus, detail = {}) {
    const mission = missions.get(id)
    if (!mission) throw new Error(`Unknown mission: ${id}`)
    if (!ALLOWED[mission.status]?.has(nextStatus)) throw new Error(`Invalid mission transition: ${mission.status} -> ${nextStatus}`)
    const previous = mission.status
    mission.status = nextStatus
    mission.updatedAt = clock()
    if (nextStatus === MISSION_STATUS.COMPLETED) mission.result = detail.result ?? null
    if (nextStatus === MISSION_STATUS.FAILED) mission.error = detail.error ?? 'Mission failed'
    emit('mission.transition', id, { previous, next: nextStatus, ...detail })
    return clone(mission)
  }

  function requestApproval(id, action, context = {}) {
    const mission = missions.get(id)
    if (!mission) throw new Error(`Unknown mission: ${id}`)
    if (mission.status !== MISSION_STATUS.RUNNING) throw new Error('Approval can only be requested by a running mission')
    const approval = {
      id: `NEO-APPROVAL-${idFactory()}`,
      missionId: id,
      action,
      context: clone(context),
      status: 'pending',
      requestedAt: clock(),
      decidedAt: null,
      decision: null,
    }
    approvals.set(approval.id, approval)
    transition(id, MISSION_STATUS.AWAITING_APPROVAL, { approvalId: approval.id, action })
    emit('approval.requested', id, { approvalId: approval.id, action })
    return clone(approval)
  }

  function decideApproval(approvalId, decision, actor = 'human') {
    const approval = approvals.get(approvalId)
    if (!approval) throw new Error(`Unknown approval: ${approvalId}`)
    if (approval.status !== 'pending') throw new Error('Approval already decided')
    if (!['approved', 'rejected'].includes(decision)) throw new TypeError('decision must be approved or rejected')
    approval.status = decision
    approval.decision = { actor, value: decision }
    approval.decidedAt = clock()
    emit(`approval.${decision}`, approval.missionId, { approvalId, actor })
    if (decision === 'approved') transition(approval.missionId, MISSION_STATUS.RUNNING, { approvalId })
    else transition(approval.missionId, MISSION_STATUS.CANCELLED, { approvalId, reason: 'approval_rejected' })
    return clone(approval)
  }

  function listApprovals({ status } = {}) {
    return [...approvals.values()].filter((a) => !status || a.status === status).map(clone)
  }

  function heartbeat(connectorId, state, detail = {}) {
    if (!connectorId || !state) throw new TypeError('connectorId and state are required')
    const heartbeat = { connectorId, state, detail: clone(detail), checkedAt: clock() }
    connectorHealth.set(connectorId, heartbeat)
    emit('connector.heartbeat', null, heartbeat)
    return clone(heartbeat)
  }

  function telemetry({ eventLimit = 50 } = {}) {
    const missionList = list()
    return {
      generatedAt: clock(),
      summary: {
        total: missionList.length,
        queued: missionList.filter((m) => m.status === MISSION_STATUS.QUEUED).length,
        running: missionList.filter((m) => m.status === MISSION_STATUS.RUNNING).length,
        awaitingApproval: missionList.filter((m) => m.status === MISSION_STATUS.AWAITING_APPROVAL).length,
        terminal: missionList.filter((m) => TERMINAL.has(m.status)).length,
        pendingApprovals: listApprovals({ status: 'pending' }).length,
      },
      missions: missionList,
      approvals: listApprovals(),
      connectors: [...connectorHealth.values()].map(clone),
      events: events.slice(0, eventLimit).map(clone),
    }
  }

  return Object.freeze({ queue, get, list, transition, requestApproval, decideApproval, listApprovals, heartbeat, telemetry })
}
