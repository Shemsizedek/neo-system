import { createHash } from 'node:crypto';
import { proposeGateOrder } from './gate-orders.mjs';

const idPattern = /^[a-zA-Z0-9][a-zA-Z0-9._:-]{0,127}$/;
const digest = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');

/**
 * Redis EVAL makes cross-process idempotency, gate-revision fencing and enqueue
 * one atomic operation. No worker, provider, DNS change or gate execution here.
 */
export const ACCEPT_ORDER_LUA = String.raw`
local previous = redis.call('GET', KEYS[2])
if previous then return {'DUPLICATE', previous} end
local current = redis.call('GET', KEYS[1])
if not current then return {'NOT_CONFIGURED', ''} end
local gate = cjson.decode(current)
if gate.id ~= ARGV[1] or tonumber(gate.revision) ~= tonumber(ARGV[2]) then
  return {'STALE_GATE', ''}
end
if gate.closed == true then return {'CLOSED_GATE', ''} end
if ARGV[3] == 'NEXT_GATE' then
  if type(gate.next) ~= 'table' or gate.next.id ~= ARGV[4] then return {'MISSING_NEXT_GATE', ''} end
  local already = redis.call('GET', KEYS[4])
  if already then return {'GATE_REVISION_ALREADY_ORDERED', already} end
end
local receipt = cjson.decode(ARGV[5])
if ARGV[3] == 'NEXT_GATE' then
  if gate.next.approvalClass == 'A' then
    receipt.status = 'QUEUED_FOR_AUTHORIZED_RUN'
  else
    receipt.status = 'AWAITING_APPROVAL'
  end
else
  receipt.status = 'RECORDED'
end
local packed = cjson.encode(receipt)
redis.call('SET', KEYS[2], packed)
if ARGV[3] == 'NEXT_GATE' then redis.call('SET', KEYS[4], receipt.orderId) end
if receipt.status == 'QUEUED_FOR_AUTHORIZED_RUN' then redis.call('RPUSH', KEYS[3], receipt.orderId) end
return {'RECORDED', packed}
`;

function redisCommand({ url, token, fetchImpl }, parts) {
  return fetchImpl(url.replace(/\/$/, ''), {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(parts)
  }).then(async response => {
    if (!response.ok) throw new Error('chords_store_unavailable');
    const body = await response.json();
    if (body.error) throw new Error('chords_store_failure');
    return body.result;
  });
}

export function createRedisChordsHandoffStore({
  url = process.env.UPSTASH_REDIS_REST_URL,
  token = process.env.UPSTASH_REDIS_REST_TOKEN,
  prefix = 'neo:chords:v1',
  fetchImpl = fetch
} = {}) {
  if (!url || !token) throw new Error('chords_redis_credentials_required');
  if (!/^[A-Za-z0-9:_-]{1,96}$/.test(prefix)) throw new TypeError('invalid_chords_prefix');
  const cfg = { url, token, fetchImpl };
  const activeKey = `${prefix}:active-gate`;
  return Object.freeze({
    mode: 'upstash-redis', durable: true,
    async readGate() {
      const raw = await redisCommand(cfg, ['GET', activeKey]);
      return raw ? JSON.parse(raw) : null;
    },
    async submit(proposal) {
      if (!proposal || proposal.status !== 'PROPOSED' || proposal.executes !== false || !idPattern.test(proposal.gateId || '') || !/^[a-f0-9]{32}$/.test(proposal.orderId || ''))
        throw new TypeError('validated_proposal_required');
      const receipt = {
        orderId: proposal.orderId,
        gateId: proposal.gateId,
        expectedRevision: proposal.expectedRevision,
        nextGateId: proposal.nextGateId,
        principal: proposal.principal,
        verb: proposal.verb,
        requestDigest: digest([proposal.principal, proposal.gateId, proposal.expectedRevision, proposal.verb, proposal.orderId]),
        status: 'PENDING'
      };
      const revKey = `${prefix}:revision:${proposal.gateId}:${proposal.expectedRevision}`;
      const keys = [activeKey, `${prefix}:order:${proposal.orderId}`, `${prefix}:pending`, revKey];
      const command = ['EVAL', ACCEPT_ORDER_LUA, 4, ...keys, proposal.gateId, String(proposal.expectedRevision), proposal.verb, proposal.nextGateId || '', JSON.stringify(receipt)];
      const result = await redisCommand(cfg, command);
      if (!Array.isArray(result) || result.length !== 2) throw new Error('chords_store_invalid_result');
      const [code, value] = result;
      if (code === 'RECORDED' || code === 'DUPLICATE') {
        const stored = JSON.parse(value);
        if (stored.orderId !== receipt.orderId || stored.requestDigest !== receipt.requestDigest) throw new Error('chords_receipt_mismatch');
        return { status: code === 'DUPLICATE' ? 'DUPLICATE' : stored.status, receipt: stored, newlyQueued: code === 'RECORDED' && stored.status === 'QUEUED_FOR_AUTHORIZED_RUN' };
      }
      return { status: 'BLOCKED', reason: code, newlyQueued: false };
    }
  });
}

/** Subject and scopes must be obtained from trusted NEOpass auth code, not body. */
export function createChordsGateHandoff({ store, resolvePrincipal } = {}) {
  if (!store || typeof store.readGate !== 'function' || typeof store.submit !== 'function') throw new TypeError('atomic_store_required');
  if (typeof resolvePrincipal !== 'function') throw new TypeError('verified_auth_resolver_required');
  return Object.freeze({
    async submit({ utterance, expectedRevision, authContext, source = 'operator_voice' } = {}) {
      const principal = await resolvePrincipal(authContext);
      if (!principal || principal.verified !== true || !Array.isArray(principal.scopes) || !principal.scopes.includes('chords.gate.propose'))
        throw new Error('verified_operator_scope_required');
      const gate = await store.readGate();
      if (!gate) return { status: 'BLOCKED', reason: 'active_gate_not_configured', executes: false };
      const proposal = proposeGateOrder({ utterance, principal, gate, expectedRevision, source });
      if (proposal.status !== 'PROPOSED') return proposal;
      const result = await store.submit(proposal);
      return { ...result, orderId: proposal.orderId, executes: false };
    }
  });
}
