import { DOCTRINE_PROFILE, EMERGING_INTERFACE_PROFILE, HUMAN_APPROVAL_ACTIONS, PROVIDER_ROLES } from './policy.mjs'
import { buildNeoPerspectiveInstructions } from './neo-perspective.mjs'

const DEFAULT_ROUTES = Object.freeze({
  orchestration: ['anthropic', 'openai', 'gemini', 'cloudflare'],
  planning: ['anthropic', 'openai', 'gemini', 'cloudflare'],
  review: ['anthropic', 'openai', 'gemini', 'cloudflare'],
  reasoning: ['openai', 'meta-muse', 'anthropic', 'gemini', 'cloudflare'],
  backend: ['openai', 'anthropic', 'gemini', 'cloudflare'],
  'tool-use': ['openai', 'meta-muse', 'anthropic', 'gemini', 'cloudflare'],
  frontend: ['gemini', 'openai', 'anthropic', 'cloudflare'],
  design: ['gemini', 'meta-muse', 'anthropic', 'openai', 'cloudflare'],
  multimodal: ['gemini', 'meta-muse', 'openai', 'anthropic'],
  edge: ['cloudflare', 'openai', 'anthropic', 'gemini'],
  'internet-of-things': ['cloudflare', 'openai', 'anthropic', 'gemini'],
  media: ['gemini', 'meta-muse', 'openai', 'anthropic', 'cloudflare'],
  personalization: ['meta-muse', 'openai', 'gemini', 'anthropic'],
  resilience: ['cloudflare', 'openai', 'anthropic', 'gemini'],
})

export function createNeoRouter({
  providers,
  maxHops = 6,
  routes = DEFAULT_ROUTES,
  circuitBreaker = { failureThreshold: 3, cooldownMs: 60_000 },
  now = () => Date.now(),
  telemetryRecorder = async () => {},
} = {}) {
  const providerMap = new Map((providers ?? []).map((provider) => [provider.id, provider]))
  const telemetry = new Map([...providerMap.keys()].map((id) => [id, {
    attempts: 0,
    successes: 0,
    failures: 0,
    consecutiveFailures: 0,
    lastLatencyMs: null,
    lastError: null,
    lastSuccessAt: null,
    lastFailureAt: null,
    circuitOpenUntil: null,
  }]))

  const stateFor = (id) => telemetry.get(id)

  function circuitOpen(id) {
    const state = stateFor(id)
    if (!state?.circuitOpenUntil) return false
    if (now() >= state.circuitOpenUntil) {
      state.circuitOpenUntil = null
      state.consecutiveFailures = 0
      return false
    }
    return true
  }

  function plan(mission) {
    if (!mission?.missionId || !mission?.objective || !mission?.capability) {
      throw new TypeError('missionId, objective, and capability are required')
    }
    const excluded = new Set(mission.excludedProviders ?? [])
    const eligible = (routes[mission.capability] ?? []).filter((id) => providerMap.get(id)?.configured && !excluded.has(id) && !circuitOpen(id))
    const preferred = (mission.preferredProviders ?? []).filter((id) => eligible.includes(id))
    const candidates = [...new Set([...preferred, ...eligible])]
    return {
      missionId: mission.missionId,
      capability: mission.capability,
      candidates,
      approvalRequired: (mission.actions ?? []).some((action) => HUMAN_APPROVAL_ACTIONS.has(action)),
      doctrine: DOCTRINE_PROFILE,
      emergingInterfaces: EMERGING_INTERFACE_PROFILE,
    }
  }

  function health() {
    const providers = [...providerMap.values()].map(({ id, configured }) => {
      const state = stateFor(id)
      return {
        id,
        configured: Boolean(configured),
        roles: PROVIDER_ROLES[id] ?? [],
        circuit: {
          open: circuitOpen(id),
          openUntil: state?.circuitOpenUntil ? new Date(state.circuitOpenUntil).toISOString() : null,
          consecutiveFailures: state?.consecutiveFailures ?? 0,
        },
        telemetry: {
          attempts: state?.attempts ?? 0,
          successes: state?.successes ?? 0,
          failures: state?.failures ?? 0,
          lastLatencyMs: state?.lastLatencyMs ?? null,
          lastSuccessAt: state?.lastSuccessAt ?? null,
          lastFailureAt: state?.lastFailureAt ?? null,
          lastError: state?.lastError ?? null,
        },
      }
    })
    return {
      ok: providers.some((provider) => provider.configured),
      configured: providers.filter((provider) => provider.configured).map((provider) => provider.id),
      providers,
      capabilities: Object.keys(routes),
    }
  }

  async function execute(mission, { approved = false } = {}) {
    const routePlan = plan(mission)
    if (routePlan.approvalRequired && !approved) {
      return { status: 'awaiting_approval', ...routePlan }
    }
    if (!routePlan.candidates.length) {
      return { status: 'blocked', reason: 'No configured provider supports the requested capability', ...routePlan }
    }

    const failures = []
    for (const providerId of routePlan.candidates.slice(0, maxHops)) {
      try {
        const provider = providerMap.get(providerId)
        const state = stateFor(providerId)
        const startedAt = now()
        state.attempts += 1
        await telemetryRecorder({ provider: providerId, event: 'attempt' }).catch(() => {})
        const result = await provider.invoke({
          system: mission.system ?? buildNeoPerspectiveInstructions({ context: mission.perspectiveContext }),
          prompt: mission.objective,
          maxTokens: mission.maxTokens,
          previousResponseId: mission.previousResponseId,
        })
        state.successes += 1
        state.consecutiveFailures = 0
        state.lastLatencyMs = Math.max(0, now() - startedAt)
        state.lastSuccessAt = new Date(now()).toISOString()
        state.lastError = null
        state.circuitOpenUntil = null
        await telemetryRecorder({ provider: providerId, event: 'success', latencyMs: state.lastLatencyMs }).catch(() => {})
        return { status: 'completed', route: providerId, result, failures, ...routePlan }
      } catch (error) {
        const state = stateFor(providerId)
        const message = error instanceof Error ? error.message : String(error)
        state.failures += 1
        state.consecutiveFailures += 1
        state.lastFailureAt = new Date(now()).toISOString()
        state.lastError = message
        if (state.consecutiveFailures >= circuitBreaker.failureThreshold) {
          state.circuitOpenUntil = now() + circuitBreaker.cooldownMs
        }
        await telemetryRecorder({ provider: providerId, event: 'failure', error: message }).catch(() => {})
        failures.push({ provider: providerId, message })
      }
    }
    return { status: 'blocked', reason: 'All eligible providers failed', failures, ...routePlan }
  }

  return { plan, execute, health, providerRoles: PROVIDER_ROLES }
}
