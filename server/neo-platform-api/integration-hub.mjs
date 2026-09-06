import { createHmac, timingSafeEqual } from 'node:crypto';

const MUTATION_WORDS = /(^|_)(create|update|delete|destroy|send|write|post|put|patch|remove|pay|payout|withdraw|transfer|sign|custod|execute|manage|multi|remote|connection)(_|$)/i;
const READ_WORDS = /(^|_)(read|list|get|fetch|search|retrieve|check|status|describe|inspect|query|find|lookup|observe|health)(_|$)/i;

function normalizeTool(tool) {
  const slug = String(tool.slug || tool.name || '');
  const name = String(tool.name || slug);
  const description = String(tool.description || tool.meta?.description || '');
  const signature = `${slug}_${name}_${description}`;
  const classification = !MUTATION_WORDS.test(signature) && (tool.readOnly === true || READ_WORDS.test(signature)) ? 'read' : 'write';
  const toolkit = tool.toolkit && typeof tool.toolkit === 'object' ? (tool.toolkit.slug || tool.toolkit.name) : tool.toolkit;
  const integration = String(toolkit || tool.integration || slug.split('_')[0] || 'composio').toLowerCase();
  return { name, slug, integration, provider: 'composio', classification, capabilities: [slug], health: 'unknown', lastSuccessfulOperation: null };
}

function redact(value) {
  if (Array.isArray(value)) return value.map(redact);
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(Object.entries(value).map(([key, item]) => {
    if (/token|secret|key|password|credential|authorization|cookie/i.test(key)) return [key, '[REDACTED]'];
    return [key, redact(item)];
  }));
}

function errorMessage(error) {
  return String(error?.message || error || 'unknown error').replace(/(token|secret|key|password|credential|authorization)[^\s,;]*/ig, '$1=[REDACTED]');
}

export class IntegrationHubError extends Error {
  constructor(code, message, status = 400) { super(message); this.code = code; this.status = status; }
}

export function createComposioClient({ apiKey = process.env.COMPOSIO_API_KEY, baseUrl = process.env.COMPOSIO_BASE_URL || 'https://backend.composio.dev' } = {}) {
  async function request(path, options = {}) {
    if (!apiKey) throw new IntegrationHubError('composio_authentication_failed', 'Composio authentication is not configured.', 502);
    const headers = { 'x-api-key': apiKey, ...(options.headers || {}) };
    if (typeof options.body === 'string') {
      headers['content-type'] = 'application/json';
      headers['content-length'] = String(Buffer.byteLength(options.body));
    }
    const response = await fetch(`${baseUrl}${path}`, { ...options, headers });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) throw new IntegrationHubError(response.status === 401 || response.status === 403 ? 'composio_authentication_failed' : 'composio_request_failed', errorMessage(body?.message || body?.error || `Composio request failed with HTTP ${response.status}.`), 502);
    return body;
  }
  return {
    createSession: subject => request('/api/v3/tool_router/session', { method: 'POST', body: JSON.stringify({ user_id: subject }) }),
    listTools: sessionId => request(`/api/v3/tool_router/session/${encodeURIComponent(sessionId)}/tools`),
    execute: (sessionId, toolSlug, argumentsValue) => request(`/api/v3/tool_router/session/${encodeURIComponent(sessionId)}/execute`, { method: 'POST', body: JSON.stringify({ tool_slug: toolSlug, arguments: argumentsValue || {} }) })
  };
}

export function createIntegrationHub({ composio = createComposioClient(), now = () => new Date().toISOString(), audit = () => {} } = {}) {
  const sessions = new Map();

  function record({ subject, integration, operation, classification, allowed }) {
    audit(redact({ subject, integration, operation, classification, allowed, timestamp: now() }));
  }

  async function sessionFor(subject) {
    const existing = sessions.get(subject);
    if (existing) return existing;
    try {
      const created = await composio.createSession(subject);
      const sessionId = created?.session_id;
      if (!sessionId) throw new Error('Composio did not return a session id.');
      const tools = await composio.listTools(sessionId);
      const session = { sessionId, tools: (tools?.items || []).map(normalizeTool) };
      sessions.set(subject, session);
      return session;
    } catch (error) {
      throw error instanceof IntegrationHubError ? error : new IntegrationHubError('composio_session_failed', errorMessage(error), 502);
    }
  }

  function integrations(session) {
    const byIntegration = new Map();
    for (const tool of session.tools) {
      const current = byIntegration.get(tool.integration) || { name: tool.integration, provider: 'composio', status: 'ready', capabilities: [], classifications: new Set(), health: 'ready', lastSuccessfulOperation: null };
      current.capabilities.push(tool.name);
      current.classifications.add(tool.classification);
      if (tool.lastSuccessfulOperation && (!current.lastSuccessfulOperation || tool.lastSuccessfulOperation > current.lastSuccessfulOperation)) current.lastSuccessfulOperation = tool.lastSuccessfulOperation;
      byIntegration.set(tool.integration, current);
    }
    return [...byIntegration.values()].map(item => ({ ...item, classifications: [...item.classifications] }));
  }

  return {
    async list(subject) { return { integrations: integrations(await sessionFor(subject)) }; },
    async status(subject, integration) {
      const session = await sessionFor(subject);
      const item = integrations(session).find(value => value.name === integration);
      if (!item) throw new IntegrationHubError('integration_not_found', 'Integration is not available to this subject.', 404);
      return item;
    },
    async execute(subject, { integration, tool, arguments: argumentsValue }) {
      const session = await sessionFor(subject);
      const candidate = session.tools.find(value => value.slug === tool && value.integration === String(integration).toLowerCase());
      if (!candidate) {
        record({ subject, integration, operation: tool, classification: 'unknown', allowed: false });
        throw new IntegrationHubError('tool_not_found', 'Requested integration capability is not available.', 404);
      }
      if (candidate.classification !== 'read') {
        record({ subject, integration, operation: tool, classification: candidate.classification, allowed: false });
        throw new IntegrationHubError('read_only_operation_required', 'Only approved read operations are available.', 403);
      }
      record({ subject, integration, operation: tool, classification: candidate.classification, allowed: true });
      try {
        const result = await composio.execute(session.sessionId, candidate.slug, argumentsValue);
        candidate.lastSuccessfulOperation = now();
        return { integration, operation: candidate.slug, classification: 'read', readOnly: true, data: redact(result?.data ?? result), error: result?.error || null };
      } catch (error) {
        throw error instanceof IntegrationHubError ? error : new IntegrationHubError('composio_execution_failed', errorMessage(error), 502);
      }
    }
  };
}

export function createNeopassSubjectResolver({ secret = process.env.NEO_PASS_JWT_SECRET, issuer = process.env.NEO_PASS_JWT_ISSUER } = {}) {
  return req => {
    const authorization = String(req.headers.authorization || '');
    const token = authorization.startsWith('Bearer ') ? authorization.slice(7).trim() : '';
    if (!secret || !token) return null;
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    try {
      const header = JSON.parse(Buffer.from(parts[0], 'base64url').toString('utf8'));
      const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'));
      if (header.alg !== 'HS256' || header.typ !== 'JWT' || !payload.sub || (payload.exp && Number(payload.exp) <= Math.floor(Date.now() / 1000)) || (issuer && payload.iss !== issuer)) return null;
      const expected = createHmac('sha256', secret).update(`${parts[0]}.${parts[1]}`).digest();
      const actual = Buffer.from(parts[2], 'base64url');
      if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) return null;
      return String(payload.sub);
    } catch {
      return null;
    }
  };
}

export const resolveNeopassSubject = createNeopassSubjectResolver();

export function resolveLegacyNeopassSubject(req) {
  const authorization = String(req.headers.authorization || '');
  const subject = String(req.headers['x-neopass-subject'] || '').trim();
  if (!authorization.startsWith('Bearer ') || !authorization.slice(7).trim() || !subject) return null;
  return subject;
}