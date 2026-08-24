import { createMissionEngine, MISSION_STATUS } from '../server/neo-router/mission-engine.mjs'
import { runtimeBindingHealth } from '../server/neo-router/runtime-bindings.mjs'

const engine = createMissionEngine()
let initialized = false

function initialize() {
  if (initialized) return
  initialized = true

  engine.queue({
    id: 'NEO-ROUTER-MISSION-001',
    objective: 'Triage and safely rebase stale neo-system pull requests, rerun CI, preserve provenance, and stop at approval gates before consequential merges.',
    priority: 'high',
    route: ['github-native', 'asana-native', 'airbyte-agent-engine'],
    provenance: ['github:Shemsizedek/neo-system', 'asana:1217756114723188'],
  })
  engine.transition('NEO-ROUTER-MISSION-001', MISSION_STATUS.RUNNING)

  engine.heartbeat('github-native', 'healthy', { role: 'primary_software_system_of_record' })
  engine.heartbeat('asana-native', 'healthy', { role: 'mission_execution_tracker' })
  engine.heartbeat('airbyte-agent-engine', 'degraded', { reason: 'schema_discovery_error', fallback: 'native_connectors' })

  const bindings = runtimeBindingHealth(process.env)
  for (const binding of Object.values(bindings.bindings)) {
    engine.heartbeat(binding.connector, binding.bound ? 'bound' : 'unbound', { envKey: binding.envKey })
  }
}

export default function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    return res.status(405).json({ error: 'read_only_endpoint' })
  }

  initialize()
  res.setHeader('Cache-Control', 'no-store')
  return res.status(200).json(engine.telemetry({ eventLimit: 30 }))
}
