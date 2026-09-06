const CAPABILITY_NAMESPACES = new Set(['calendar', 'email', 'files', 'contacts', 'tasks', 'communications', 'development']);

function validCapability(value) {
  const capability = String(value || '').trim().toLowerCase();
  const [namespace, resource, operation] = capability.split('.');
  if (!namespace || !resource || !operation || capability.split('.').length !== 3 || !CAPABILITY_NAMESPACES.has(namespace)) return null;
  return capability;
}

export class CommandRouterError extends Error {
  constructor(code, message, status = 400) { super(message); this.code = code; this.status = status; }
}

export function createCommandRouter({ integrationHub, now = () => new Date().toISOString(), audit = () => {} } = {}) {
  if (!integrationHub) throw new Error('integration_hub_required');
  return {
    async execute(subject, request) {
      if (!subject) throw new CommandRouterError('neopass_identity_required', 'NEOpass identity is required.', 401);
      const capability = validCapability(request?.capability);
      if (!capability) throw new CommandRouterError('invalid_capability', 'A supported NEO capability is required.', 400);
      const event = { subject, integration: null, operation: capability, classification: 'read', allowed: false, timestamp: now() };
      try {
        const result = await integrationHub.executeCapability(subject, capability, request?.parameters || {});
        event.integration = result.provider;
        event.allowed = true;
        audit(event);
        return { ok: true, capability, provider: result.provider, data: result.data, timestamp: now() };
      } catch (error) {
        event.integration = error.integration || null;
        audit(event);
        if (error instanceof CommandRouterError) throw error;
        throw new CommandRouterError(error.code || 'provider_failure', error.message || 'Provider execution failed.', error.status || 502);
      }
    }
  };
}