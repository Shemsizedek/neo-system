import { randomUUID } from 'node:crypto';

export const APPLICATION_REGISTRY = Object.freeze({
  'neo-dash': { displayName: 'NEO Dash', namespaces: ['calendar', 'contacts', 'files', 'tasks'], readOnly: true, health: 'ready', enabled: true },
  'neo-algo': { displayName: 'NEO Algo', namespaces: ['calendar', 'email', 'files', 'contacts', 'tasks', 'communications', 'development'], readOnly: true, health: 'ready', enabled: true },
  'neo-cipher': { displayName: 'NEO Cipher', namespaces: ['files', 'calendar', 'tasks'], readOnly: true, health: 'ready', enabled: true },
  'neo-pads': { displayName: 'NEO Pads', namespaces: ['calendar', 'contacts', 'files'], readOnly: true, health: 'ready', enabled: true },
  'neo-counter': { displayName: 'NEO Counter', namespaces: ['contacts', 'files'], readOnly: true, health: 'ready', enabled: true },
  'neo-teller': { displayName: 'NEO Teller', namespaces: ['calendar', 'contacts', 'files'], readOnly: true, health: 'ready', enabled: true },
  'neo-wire': { displayName: 'NEO Wire', namespaces: ['contacts', 'files', 'communications'], readOnly: true, health: 'ready', enabled: true },
  'neo-explorer': { displayName: 'NEO Explorer', namespaces: ['development', 'files'], readOnly: true, health: 'ready', enabled: true },
  'world-temple': { displayName: 'World Temple / holytemples.org', namespaces: ['calendar', 'email', 'contacts', 'files', 'tasks', 'communications', 'development'], readOnly: true, health: 'ready', enabled: true }
});

export class ControlPlaneError extends Error {
  constructor(code, message, status = 400) { super(message); this.code = code; this.status = status; }
}

function namespaceOf(capability) { return String(capability || '').split('.')[0]; }

export function createControlPlane({ commandRouter, now = () => new Date().toISOString(), audit = () => {}, requestId = () => randomUUID() } = {}) {
  if (!commandRouter) throw new Error('command_router_required');
  function applicationFor(applicationId) {
    const application = APPLICATION_REGISTRY[applicationId];
    if (!application) throw new ControlPlaneError('unknown_application', 'Application is not registered.', 404);
    if (!application.enabled) throw new ControlPlaneError('application_disabled', 'Application is disabled.', 403);
    return application;
  }
  function record(event) { audit({ ...event, timestamp: now() }); }
  return {
    registry: APPLICATION_REGISTRY,
    async capabilities(subject, applicationId) {
      const application = applicationFor(applicationId);
      if (!subject) throw new ControlPlaneError('neopass_identity_required', 'NEOpass identity is required.', 401);
      const available = await commandRouter.listCapabilities(subject);
      return { applicationId, displayName: application.displayName, health: application.health, enabled: application.enabled, readOnly: application.readOnly, capabilities: available.capabilities.filter(item => application.namespaces.includes(namespaceOf(item.capability))) };
    },
    async execute(subject, applicationId, request) {
      const id = requestId();
      const application = applicationFor(applicationId);
      if (!subject) throw new ControlPlaneError('neopass_identity_required', 'NEOpass identity is required.', 401);
      const capability = String(request?.capability || '').toLowerCase();
      const allowed = application.namespaces.includes(namespaceOf(capability));
      if (!allowed) {
        record({ requestId: id, application: applicationId, subject, requestedCapability: capability, allow: false, provider: null, outcome: 'forbidden' });
        throw new ControlPlaneError('application_capability_forbidden', 'Capability is not enabled for this application.', 403);
      }
      try {
        const result = await commandRouter.execute(subject, request);
        record({ requestId: id, application: applicationId, subject, requestedCapability: capability, allow: true, provider: result.provider, outcome: 'success' });
        return { requestId: id, applicationId, capability: result.capability, status: 'ok', provider: result.provider, data: result.data, timestamp: now() };
      } catch (error) {
        record({ requestId: id, application: applicationId, subject, requestedCapability: capability, allow: true, provider: null, outcome: 'failure' });
        throw error;
      }
    }
  };
}