import { Composio } from '@composio/core'
import { OpenAIAgentsProvider } from '@composio/openai-agents'
import { Agent } from '@openai/agents'

export const COMPOSIO_READ_ONLY_POLICY = Object.freeze({
  readOnly: true,
  denied: Object.freeze([
    'create', 'update', 'delete', 'send_message', 'send_email',
    'financial_transaction', 'payout', 'custody', 'signing',
    'autonomous_external_action',
  ]),
})

const WRITE_MARKERS = Object.freeze([
  'create', 'update', 'delete', 'send', 'email', 'message', 'transaction',
  'payout', 'custody', 'sign', 'transfer', 'payment', 'write', 'modify',
])

function subjectId(identity) {
  const value = identity?.subjectId
  if (identity?.trustBoundary !== 'neo-gateway' || !identity?.authenticated || typeof value !== 'string' || !value.trim()) {
    throw new Error('neopass_identity_required')
  }
  return value.trim()
}

function isWriteCapable(tool) {
  const value = `${tool?.slug ?? ''} ${tool?.name ?? ''} ${tool?.description ?? ''}`.toLowerCase()
  return WRITE_MARKERS.some((marker) => value.includes(marker))
}

function safeTool(tool) {
  return { slug: String(tool.slug), name: tool.name ?? null, description: tool.description ?? null }
}

function defaultClient() {
  const apiKey = process.env.COMPOSIO_API_KEY
  if (!apiKey) return null
  return new Composio({ apiKey, provider: new OpenAIAgentsProvider({ strict: true }) })
}

export function composioRuntimeCheck() {
  return { composioConfigured: Boolean(process.env.COMPOSIO_API_KEY) }
}

export function composioHealth({ client = defaultClient() } = {}) {
  return {
    ok: Boolean(client),
    service: 'neo-router-composio-gateway',
    ...composioRuntimeCheck(),
    readOnly: COMPOSIO_READ_ONLY_POLICY.readOnly,
    mutations: false,
    clientInitialized: Boolean(client),
  }
}

export function createReadOnlyAgent({ tools = [] } = {}) {
  return new Agent({
    name: 'NEO Composio Read Only',
    instructions: 'Use Composio tools only for authenticated read-only retrieval. Never mutate external state.',
    tools,
  })
}

export function createComposioGateway({ client = defaultClient() } = {}) {
  return {
    health() {
      return composioHealth({ client })
    },

    async readOnlyTools(identity) {
      const userId = subjectId(identity)
      if (!client) return { status: 'unavailable', reason: 'composio_not_configured', readOnly: true }

      const session = await client.create(userId)
      const tools = await session.tools()
      const rejected = tools.filter(isWriteCapable)
      if (rejected.length) return { status: 'policy_blocked', reason: 'write_capable_tool_exposed', readOnly: true }
      if (!tools.length) return { status: 'connection_required', reason: 'no_read_only_connection', readOnly: true }

      createReadOnlyAgent({ tools })
      return { status: 'ok', readOnly: true, tools: tools.map(safeTool) }
    },

    async executeReadOnly(identity, tool) {
      const userId = subjectId(identity)
      if (!tool?.slug || isWriteCapable(tool)) throw new Error('write_capable_tool_rejected')
      if (!client) return { status: 'unavailable', reason: 'composio_not_configured', readOnly: true }
      const session = await client.create(userId)
      return { status: 'ok', readOnly: true, result: await session.execute(tool.slug, tool.arguments ?? {}) }
    },
  }
}
