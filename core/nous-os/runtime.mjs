import { randomUUID } from 'node:crypto';
import { loadAgentRegistry } from './registry.mjs';
import { createSourceInventory } from './sources.mjs';
import { IdentityError } from './identity.mjs';

const HIGH_RISK = new Set(['finance.transfer', 'wallet.sign', 'code.deploy', 'content.publish', 'records.write', 'credentials.change']);
const IDENTIFIER = /^[a-zA-Z0-9._:-]{1,80}$/;

export class NousPolicyError extends Error {
  constructor(code, status = 403) { super(code); this.code = code; this.status = status; }
}

/** Local plan-only service. Neither routing nor snapshots execute source TypeScript modules. */
export function createNousRuntime({
  identityVerifier,
  audit = () => {},
  now = () => new Date().toISOString(),
  registry = loadAgentRegistry(),
  sources = createSourceInventory(),
  receiptStore = null,
} = {}) {
  if (!identityVerifier || typeof identityVerifier.verifyAuthorization !== 'function') throw new TypeError('identity_verifier_required');
  const agents = [...registry];
  if (!agents.length || new Set(agents.map(agent => agent.id)).size !== agents.length) throw new Error('nous_registry_invalid');
  const authorize = (header, scope) => {
    const identity = identityVerifier.verifyAuthorization(header);
    if (!identity.scopes.has(scope)) throw new IdentityError('scope_denied', 403);
    return identity;
  };
  return {
    identityReady: () => identityVerifier.configured,
    stateStatus: () => receiptStore ? receiptStore.stats() : { durable: false, multiWriter: false },
    listAgents(header) {
      authorize(header, 'nous.agents.read');
      return { mode: 'plan-only', agents: agents.map(agent => ({ ...agent, status: 'routing_only' })) };
    },
    listSources(header) {
      authorize(header, 'nous.sources.read');
      return { mode: 'read-only', sources: sources.list() };
    },
    plan(header, task) {
      const identity = authorize(header, 'nous.task.plan');
      if (!task || typeof task !== 'object' || Array.isArray(task)) throw new NousPolicyError('invalid_task', 400);
      const { requestId, agentId, capability } = task;
      if (![requestId, agentId, capability].every(v => typeof v === 'string' && IDENTIFIER.test(v))) throw new NousPolicyError('invalid_task', 400);
      const agent = agents.find(item => item.id === agentId);
      if (!agent) throw new NousPolicyError('unknown_agent', 404);
      const prior = receiptStore?.get(identity.subject, requestId);
      if (prior) {
        if (prior.agentId !== agentId || prior.capability !== capability) throw new NousPolicyError('nous_request_id_conflict', 409);
        return prior;
      }
      const allowed = agent.capabilities.includes(capability) && !HIGH_RISK.has(capability);
      const receipt = Object.freeze({
        receiptId: randomUUID(), requestId, agentId, capability,
        subject: identity.subject, status: allowed ? 'planned' : 'approval_required',
        execution: 'disabled', createdAt: now(),
      });
      try { receiptStore?.append(receipt); }
      catch { throw new NousPolicyError('nous_receipt_persistence_failed', 503); }
      audit({ receiptId: receipt.receiptId, requestId, agentId, capability, subject: identity.subject, disposition: receipt.status, at: receipt.createdAt });
      return receipt;
    },
  };
}
