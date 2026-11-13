import { readFileSync } from 'node:fs';

const REGISTRY_URL = new URL('../../registry/agents.yaml', import.meta.url);
const ROUTING_CAPABILITIES = Object.freeze({
  'NIA-001': ['project.plan', 'knowledge.read'],
  'NIA-006': ['finance.review'],
  'NIA-007': ['education.read', 'project.plan'],
  'NIA-008': ['development.plan', 'project.plan'],
  'NIA-013': ['knowledge.read'],
});

/**
 * Read-only, narrow parser for the exact format of registry/agents.yaml.
 * Unknown fields do not grant capabilities. Malformed/duplicate IDs fail closed.
 */
export function parseAgentRegistry(yaml) {
  if (typeof yaml !== 'string' || !/^schema_version: "1\.0"$/m.test(yaml) || !/^agents:$/m.test(yaml)) {
    throw new Error('nous_registry_schema_invalid');
  }
  const result = [];
  let current = null;
  for (const line of yaml.split(/\r?\n/)) {
    const start = line.match(/^  - id: "(NIA-\d{3})"\s*$/);
    if (start) {
      current = { id: start[1] };
      result.push(current);
      continue;
    }
    const field = line.match(/^    (name|codename|division|status|version|manifest): "([^"]+)"\s*$/);
    if (field && current) current[field[1]] = field[2];
  }
  if (!result.length || result.length > 200) throw new Error('nous_registry_empty_or_oversized');
  const seen = new Set();
  for (const agent of result) {
    if (seen.has(agent.id) || !agent.name || !agent.manifest || !agent.status || !agent.version ||
        !/^agents\/[a-z0-9-]+\/agent\.yaml$/.test(agent.manifest) || !['active', 'inactive', 'proposed', 'disabled'].includes(agent.status)) {
      throw new Error('nous_registry_entry_invalid');
    }
    seen.add(agent.id);
  }
  return Object.freeze(result.map(agent => Object.freeze({
    id: agent.id,
    name: agent.name,
    manifest: agent.manifest,
    registryStatus: agent.status,
    status: 'routing_only',
    capabilities: agent.status === 'active' ? [...(ROUTING_CAPABILITIES[agent.id] || [])] : [],
  })));
}

export function loadAgentRegistry({ source = REGISTRY_URL, reader = readFileSync } = {}) {
  return parseAgentRegistry(reader(source, 'utf8'));
}
