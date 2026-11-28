import { completeWithActiveKey, revokeKey } from './key-lifecycle.mjs';
import { enrollAgent } from './enroll-agent.mjs';
// Server-side facade only. Authentication must be supplied by trusted middleware.
// Rotation deliberately excluded until purpose-bound challenges are implemented.
export function createRelayService({pool, authorization, authenticate}) {
  if (!pool || !authorization || typeof authenticate !== 'function') throw new TypeError('missing trusted dependencies');
  return Object.freeze({
    async complete(context, receipt, signature) {
      const principal = await authenticate(context);
      if (!principal || typeof principal.agentId !== 'string' || !await authorization.canComplete(principal,receipt?.task_id)) return false;
      return completeWithActiveKey(pool,principal.agentId,receipt,signature);
    },
    async enroll(context, nonce, spki, signature) {
      const principal=await authenticate(context);
      if (!principal) return false;
      return enrollAgent(pool,authorization,principal,nonce,spki,signature);
    },
    async revoke(context, agentId, keyId) {
      const principal=await authenticate(context);
      if (!principal) return false;
      return revokeKey(pool,authorization,principal,agentId,keyId);
    }
  });
}
