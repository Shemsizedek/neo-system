import { evaluateToolRequest } from '../neo-hacker/policy.mjs'

const ROUTER_ACTION_MAP = Object.freeze({
  'restart-service': 'change-persistent-privilege',
  'rotate-key': 'change-persistent-privilege',
  'isolate-connector': 'quarantine-content',
  'change-routing': 'change-persistent-privilege',
  'deploy-build': 'change-persistent-privilege',
  'rollback-deployment': 'change-persistent-privilege',
  'investigate-reliability': 'observe',
})

export function mapRouterAction(action) {
  return ROUTER_ACTION_MAP[action] ?? action ?? 'observe'
}

export function evaluateRouterAction({ action, target = {}, approved = false, untrustedInstruction = false } = {}) {
  const mappedAction = mapRouterAction(action)
  const decision = evaluateToolRequest({
    action: mappedAction,
    target,
    humanApproved: approved,
    untrustedInstruction,
  })
  return Object.freeze({
    ...decision,
    routerAction: action ?? 'observe',
    neoHackerAction: mappedAction,
  })
}

export function requireRouterAuthorization(input = {}) {
  const decision = evaluateRouterAction(input)
  if (!decision.allowed) {
    const error = new Error(`NEO Hacker blocked router action: ${decision.reason}`)
    error.code = 'NEO_HACKER_BLOCKED'
    error.decision = decision
    throw error
  }
  return decision
}
