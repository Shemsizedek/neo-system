import { randomUUID } from 'node:crypto';

export const TEMPLE_APPLICATION_ID = 'world-temple';
export const TEMPLE_CAPABILITIES = Object.freeze({
  'library.catalog.discovery': 'files.library.list',
  'library.document.metadata': 'files.documents.list',
  'library.resource.lookup': 'files.resources.search',
  'library.linked-resource.status': 'files.resources.status',
  'store.status': 'development.store.status',
  'store.catalog.discovery': 'files.store.list',
  'store.external-link.status': 'files.store.status',
  'system.status': 'development.system.status',
  'email.metadata.search': 'email.messages.search'
});

export class TempleAdapterError extends Error {
  constructor(code, message, status = 400) { super(message); this.code = code; this.status = status; }
}

export function createTempleAdapter({ controlPlane, now = () => new Date().toISOString(), requestId = () => randomUUID(), audit = () => {} } = {}) {
  if (!controlPlane) throw new Error('control_plane_required');
  function record(event) { audit({ ...event, application: TEMPLE_APPLICATION_ID, timestamp: now() }); }
  return {
    applicationId: TEMPLE_APPLICATION_ID,
    async health(subject) {
      if (!subject) throw new TempleAdapterError('neopass_identity_required', 'NEOpass identity is required.', 401);
      const capabilities = await controlPlane.capabilities(subject, TEMPLE_APPLICATION_ID);
      return { application: TEMPLE_APPLICATION_ID, registered: true, gateway: 'ready', controlPlane: 'ready', neopassRequired: true, integration: capabilities.capabilities.length > 0 ? 'available' : 'unavailable', readOnly: true, enabled: capabilities.enabled, timestamp: now() };
    },
    async capabilities(subject) {
      if (!subject) throw new TempleAdapterError('neopass_identity_required', 'NEOpass identity is required.', 401);
      const available = await controlPlane.capabilities(subject, TEMPLE_APPLICATION_ID);
      return { application: TEMPLE_APPLICATION_ID, capabilities: Object.keys(TEMPLE_CAPABILITIES).filter(name => available.capabilities.some(item => item.capability === TEMPLE_CAPABILITIES[name])).map(capability => ({ capability, readOnly: true })) };
    },
    async read(subject, request) {
      if (!subject) throw new TempleAdapterError('neopass_identity_required', 'NEOpass identity is required.', 401);
      const capability = String(request?.capability || '').toLowerCase();
      const controlCapability = TEMPLE_CAPABILITIES[capability];
      const id = requestId();
      if (!controlCapability) {
        record({ subject, requestedCapability: capability, allow: false, provider: null, result: 'forbidden', requestId: id });
        throw new TempleAdapterError('temple_capability_forbidden', 'Capability is not available to World Temple.', 403);
      }
      try {
        const result = await controlPlane.execute(subject, TEMPLE_APPLICATION_ID, { capability: controlCapability, parameters: request?.parameters || {} });
        record({ subject, requestedCapability: capability, allow: true, provider: result.provider, result: 'success', requestId: id });
        return { ok: true, application: TEMPLE_APPLICATION_ID, requestId: id, capability, provider: result.provider, data: result.data, timestamp: now() };
      } catch (error) {
        record({ subject, requestedCapability: capability, allow: true, provider: null, result: 'failure', requestId: id });
        throw error;
      }
    }
  };
}