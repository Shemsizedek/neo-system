import { HUMAN_APPROVAL_ACTIONS } from './policy.mjs'

export const CONNECTOR_ACCESS = Object.freeze({
  READ: 'read',
  WRITE: 'write',
  HIGH_IMPACT: 'high-impact',
})

export const DEFAULT_CONNECTORS = Object.freeze([
  {
    id: 'github-native',
    platform: 'github',
    transport: 'native',
    enabled: true,
    capabilities: Object.freeze({
      repository_read: CONNECTOR_ACCESS.READ,
      issue_read: CONNECTOR_ACCESS.READ,
      pull_request_read: CONNECTOR_ACCESS.READ,
      branch_write: CONNECTOR_ACCESS.WRITE,
      file_write: CONNECTOR_ACCESS.WRITE,
      issue_write: CONNECTOR_ACCESS.WRITE,
      pull_request_write: CONNECTOR_ACCESS.WRITE,
      merge: CONNECTOR_ACCESS.HIGH_IMPACT,
      workflow_rerun: CONNECTOR_ACCESS.WRITE,
    }),
  },
  {
    id: 'airbyte-github',
    platform: 'github',
    transport: 'airbyte',
    enabled: true,
    capabilities: Object.freeze({ repository_read: CONNECTOR_ACCESS.READ }),
  },
  {
    id: 'airbyte-gitlab',
    platform: 'gitlab',
    transport: 'airbyte',
    enabled: true,
    capabilities: Object.freeze({ project_read: CONNECTOR_ACCESS.READ }),
  },
  {
    id: 'airbyte-asana',
    platform: 'asana',
    transport: 'airbyte',
    enabled: true,
    capabilities: Object.freeze({ task_read: CONNECTOR_ACCESS.READ, task_write: CONNECTOR_ACCESS.WRITE }),
  },
  {
    id: 'airbyte-gmail',
    platform: 'gmail',
    transport: 'airbyte',
    enabled: true,
    capabilities: Object.freeze({ message_read: CONNECTOR_ACCESS.READ, message_send: CONNECTOR_ACCESS.HIGH_IMPACT }),
  },
  {
    id: 'airbyte-search-console',
    platform: 'google-search-console',
    transport: 'airbyte',
    enabled: true,
    capabilities: Object.freeze({ search_performance_read: CONNECTOR_ACCESS.READ }),
  },
  {
    id: 'airbyte-tiktok-marketing',
    platform: 'tiktok-marketing',
    transport: 'airbyte',
    enabled: true,
    capabilities: Object.freeze({ analytics_read: CONNECTOR_ACCESS.READ, campaign_write: CONNECTOR_ACCESS.HIGH_IMPACT }),
  },
])

const WRITE_APPROVAL_ACTIONS = Object.freeze({
  merge: 'canonical_write',
  message_send: 'external_execution',
  campaign_write: 'publication',
})

export function createConnectorRegistry({ connectors = DEFAULT_CONNECTORS } = {}) {
  const connectorMap = new Map(connectors.map((connector) => [connector.id, connector]))

  function list({ platform, transport } = {}) {
    return [...connectorMap.values()].filter((connector) =>
      connector.enabled &&
      (!platform || connector.platform === platform) &&
      (!transport || connector.transport === transport)
    )
  }

  function plan({ platform, capability, preferredTransport } = {}) {
    if (!platform || !capability) throw new TypeError('platform and capability are required')

    const candidates = list({ platform })
      .filter((connector) => connector.capabilities[capability])
      .sort((a, b) => {
        if (!preferredTransport) return a.transport === 'native' ? -1 : 1
        return a.transport === preferredTransport ? -1 : b.transport === preferredTransport ? 1 : 0
      })

    const selected = candidates[0] ?? null
    const access = selected?.capabilities?.[capability] ?? null
    const approvalAction = WRITE_APPROVAL_ACTIONS[capability]
    const approvalRequired = access === CONNECTOR_ACCESS.HIGH_IMPACT ||
      Boolean(approvalAction && HUMAN_APPROVAL_ACTIONS.has(approvalAction))

    return {
      platform,
      capability,
      selected: selected?.id ?? null,
      transport: selected?.transport ?? null,
      access,
      approvalRequired,
      candidates: candidates.map(({ id, transport }) => ({ id, transport })),
    }
  }

  return Object.freeze({ list, plan })
}
