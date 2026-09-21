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

export function createNeoRouter({ providers, maxHops = 6, routes = DEFAULT_ROUTES } = {}) {
  const providerMap = new Map((providers ?? []).map((provider) => [provider.id, provider]))

  function plan(mission) {
    if (!mission?.missionId || !mission?.objective || !mission?.capability) {
      throw new TypeError('missionId, objective, and capability are required')
    }
    const excluded = new Set(mission.excludedProviders ?? [])
    const eligible = (routes[mission.capability] ?? []).filter((id) => providerMap.get(id)?.configured && !excluded.has(id))
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
    const providers = [...providerMap.values()].map(({ id, configured }) => ({
      id,
      configured: Boolean(configured),
      roles: PROVIDER_ROLES[id] ?? [],
    }))
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
        const result = await provider.invoke({
          system: mission.system ?? buildNeoPerspectiveInstructions({ context: mission.perspectiveContext }),
          prompt: mission.objective,
          maxTokens: mission.maxTokens,
        })
        return { status: 'completed', route: providerId, result, failures, ...routePlan }
      } catch (error) {
        failures.push({ provider: providerId, message: error instanceof Error ? error.message : String(error) })
      }
    }
    return { status: 'blocked', reason: 'All eligible providers failed', failures, ...routePlan }
  }

  return { plan, execute, health, providerRoles: PROVIDER_ROLES }
}
