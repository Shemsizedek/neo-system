const HUMAN = Object.freeze([777, 888, 999])
const ANGELIC = Object.freeze([999, 888, 777])

const RED_ACTIONS = new Set([
  'financial_transfer',
  'legal_commitment',
  'contract_execution',
  'destructive_delete',
  'irreversible_external_action',
])

const YELLOW_ACTIONS = new Set([
  'send_communication',
  'publish',
  'edit_important_record',
  'external_api_write',
])

export function cycleOrder(cycle = 'human') {
  if (cycle !== 'human' && cycle !== 'angelic') throw new TypeError('cycle must be human or angelic')
  return cycle === 'angelic' ? ANGELIC : HUMAN
}

export function classifyRisk(mission = {}) {
  const actions = new Set([...(mission.actions ?? []), mission.requestedAction].filter(Boolean))
  if (mission.consequential || [...actions].some((action) => RED_ACTIONS.has(action))) return 'red'
  if ([...actions].some((action) => YELLOW_ACTIONS.has(action))) return 'yellow'
  return 'green'
}

export function requiresApproval(risk) {
  return risk !== 'green'
}

function stageLabel(stage) {
  if (stage === 777) return 'grounding'
  if (stage === 888) return 'synthesis'
  return 'resolution'
}

export function runNeoAlgo(mission = {}, cycle = 'human') {
  const missionId = mission.id ?? mission.missionId
  if (!missionId || !mission.objective) throw new TypeError('mission id and objective are required')

  const risk = classifyRisk(mission)
  const stages = cycleOrder(cycle).map((stage) => ({
    stage,
    label: stageLabel(stage),
    notes: stage === 777
      ? ['Ground mission in evidence, context, authority, and constraints.']
      : stage === 888
        ? ['Reconcile options across logic, practicality, ethics, security, and policy.']
        : ['Resolve to the best-supported recommendation and route execution through NEO Guard.'],
  }))

  return {
    missionId,
    cycle,
    risk,
    approvalRequired: requiresApproval(risk),
    stages,
    recommendation: risk === 'green'
      ? 'Proceed with bounded advisory/autonomous work.'
      : 'Prepare the action and request human authorization before execution.',
    provenance: ['NEO-ALGO-001', `cycle:${cycle}`, `risk:${risk}`],
  }
}
