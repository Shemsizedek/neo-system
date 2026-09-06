const MUTATION_WORDS = /(^|_)(create|update|delete|destroy|send|write|post|put|patch|remove|pay|payout|withdraw|transfer|sign|custod|execute|manage|multi|remote|connection)(_|$)/i;
const READ_WORDS = /(^|_)(read|list|get|fetch|search|retrieve|check|status|describe|inspect|query|find|lookup|observe|health)(_|$)/i;

function normalizeCapability(tool) {
  const slug = String(tool.slug || tool.name || '');
  const name = String(tool.name || slug);
  const description = String(tool.description || tool.meta?.description || '');
  const signature = `${slug}_${name}_${description}`;
  const classification = !MUTATION_WORDS.test(signature) && (tool.readOnly === true || READ_WORDS.test(signature)) ? 'read' : 'write';
  const toolkit = tool.toolkit && typeof tool.toolkit === 'object' ? (tool.toolkit.slug || tool.toolkit.name) : tool.toolkit;
  const capability = tool.capability || tool.neoCapability || deriveCapability(signature);
  return { name, slug, integration: String(toolkit || tool.integration || slug.split('_')[0] || 'composio').toLowerCase(), provider: 'composio', classification, capabilities: [slug], capability, health: 'unknown', lastSuccessfulOperation: null };
}

function deriveCapability(signature) {
  const value = signature.toLowerCase();
  const namespace = ['calendar', 'email', 'files', 'contacts', 'tasks', 'communications', 'development'].find(item => value.includes(item));
  const operation = value.match(/(^|_)(list|get|fetch|search|retrieve|check|status|describe|inspect|query|find|lookup|observe|health)(_|$)/)?.[2];
  if (!namespace || !operation) return null;
  const resource = value.match(/(calendar|email|files|contacts|tasks|communications|development)[_ .-]+([a-z]+)/)?.[2];
  return resource ? `${namespace}.${resource}.${operation}` : null;
}

export function createComposioProviderAdapter({ composio, now = () => new Date().toISOString() }) {
  return {
    async createSession(subject) {
      const session = await composio.createSession(subject);
      if (!session?.session_id) throw new Error('Provider did not return a session id.');
      return session.session_id;
    },
    async listCapabilities(sessionId) {
      const tools = await composio.listTools(sessionId);
      return (tools?.items || []).map(normalizeCapability);
    },
    async executeRead(sessionId, capability, argumentsValue) {
      if (!capability || capability.classification !== 'read') throw new Error('read_only_operation_required');
      const result = await composio.execute(sessionId, capability.slug, argumentsValue);
      capability.lastSuccessfulOperation = now();
      return result;
    }
  };
}