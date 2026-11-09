import { randomUUID } from 'node:crypto';
import { AGENTS, agentById } from './agents.mjs';
import { IdentityError } from './identity.mjs';

const HIGH_RISK = new Set(['finance.transfer', 'wallet.sign', 'code.deploy', 'content.publish', 'records.write', 'credentials.change']);
const IDENTIFIER = /^[a-zA-Z0-9._:-]{1,80}$/;

export class NousPolicyError extends Error {
  constructor(code, status = 403) { super(code); this.code = code; this.status = status; }
}

/** v0 foundation: admits requests into a verifiable planning queue, never executes adapters. */
export function createNousRuntime({ identityVerifier, audit = () => {}, now = () => new Date().toISOString() } = {}) {
  if (!identityVerifier || typeof identityVerifier.verifyAuthorization !== 'function') throw new TypeError('identity_verifier_required');
  const authorize = (header, scope) => {
    const identity = identityVerifier.verifyAuthorization(header);
    if (!identity.scopes.has(scope)) throw new IdentityError('scope_denied', 403);
    return identity;
  };
  return {
    identityReady: () => identityVerifier.configured,
    listAgents(header) {
      authorize(header, 'nous.agents.read');
      return { mode: 'plan-only', agents: AGENTS.map(agent => ({ ...agent, status: 'routing_only' })) };
    },
    plan(header, task) {
      const identity = authorize(header, 'nous.task.plan');
      if (!task || typeof task !== 'object' || Array.isArray(task)) throw new NousPolicyError('invalid_task', 400);
      const { requestId, agentId, capability } = task;
      if (![requestId, agentId, capability].every(v => typeof v === 'string' && IDENTIFIER.test(v))) throw new NousPolicyError('invalid_task', 400);
      const agent = agentById(agentId);
      if (!agent) throw new NousPolicyError('unknown_agent', 404);
      const allowed = agent.capabilities.includes(capability) && !HIGH_RISK.has(capability);
      const receipt = Object.freeze({
        receiptId: randomUUID(), requestId, agentId, capability,
        subject: identity.subject, status: allowed ? 'planned' : 'approval_required',
        execution: 'disabled', createdAt: now(),
      });
      // Audit only identifiers and disposition. No bearer tokens, arguments, or freeform prompt data.
      audit({ receiptId: receipt.receiptId, requestId, agentId, capability, subject: identity.subject, disposition: receipt.status, at: receipt.createdAt });
      return receipt;
    },
  };
}
