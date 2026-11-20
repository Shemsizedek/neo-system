/**
 * NEO Chords Gate 4 — opt-in, read-only Redis work queue.
 * A Redis Lua EVAL transaction fences each queue transition. It deliberately
 * does not consume gate-order proposals from the Gate 3 :pending list.
 * No production scheduler, network listener, provider credential or DNS action.
 */
import { createHash, randomUUID } from 'node:crypto';

const ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;
const CAPABILITY = /^[a-z-]+\.[a-z-]+\.[a-z-]+$/;
const SHA = /^[0-9a-f]{64}$/;
const isId = value => typeof value === 'string' && ID.test(value);
const digest = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');

// All Redis keys share the {chords} hash tag. Default-disabled until an
// authorized operator explicitly sets :enabled = 1 out of band.
export const ADMIT_READ_LUA = String.raw`
local old = redis.call('HGET', KEYS[1], ARGV[1])
if old then return {'EXISTS', old} end
local task = cjson.decode(ARGV[2])
redis.call('HSET', KEYS[1], ARGV[1], ARGV[2])
redis.call('RPUSH', KEYS[2], ARGV[1])
return {'QUEUED', ARGV[2]}
`;

export const CLAIM_READ_LUA = String.raw`
if redis.call('GET', KEYS[3]) ~= '1' then return {'PAUSED', ''} end
local clock = redis.call('TIME')
local now = tonumber(clock[1]) * 1000 + math.floor(tonumber(clock[2]) / 1000)
for i = 1, 32 do
  local id = redis.call('LPOP', KEYS[2])
  if not id then return {'EMPTY', ''} end
  local raw = redis.call('HGET', KEYS[1], id)
  if raw then
    local task = cjson.decode(raw)
    if task.status == 'QUEUED' then
      if tonumber(task.deadlineMs) <= now then
        task.status = 'DEAD_LETTER'
        task.errorCode = 'DEADLINE_EXPIRED'
        redis.call('HSET', KEYS[1], id, cjson.encode(task))
        redis.call('LPUSH', KEYS[5], id)
      else
        task.status = 'RUNNING'
        task.attempts = task.attempts + 1
        task.generation = task.generation + 1
        task.leaseToken = ARGV[1]
        task.claimedBy = ARGV[2]
        task.leaseUntilMs = now + tonumber(ARGV[3])
        redis.call('HSET', KEYS[1], id, cjson.encode(task))
        redis.call('ZADD', KEYS[4], task.leaseUntilMs, id)
        return {'CLAIMED', cjson.encode(task)}
      end
    end
  end
end
return {'SCAN_LIMIT', ''}
`;

export const SETTLE_READ_LUA = String.raw`
local raw = redis.call('HGET', KEYS[1], ARGV[1])
if not raw then return {'NOT_FOUND', ''} end
local task = cjson.decode(raw)
if task.status ~= 'RUNNING' or task.leaseToken ~= ARGV[2] or tonumber(task.generation) ~= tonumber(ARGV[3]) then
  return {'STALE_CLAIM', ''}
end
local clock = redis.call('TIME')
local now = tonumber(clock[1]) * 1000 + math.floor(tonumber(clock[2]) / 1000)
if task.leaseUntilMs <= now then return {'LEASE_EXPIRED', ''} end
redis.call('ZREM', KEYS[2], task.id)
task.leaseToken = cjson.null
task.leaseUntilMs = cjson.null
task.claimedBy = cjson.null
if ARGV[4] == 'COMPLETE' then
  task.status = 'COMPLETED'
  task.resultDigest = ARGV[5]
  task.provider = ARGV[6]
else
  task.errorCode = ARGV[5]
  if task.attempts >= task.maxAttempts or tonumber(task.deadlineMs) <= now then
    task.status = 'DEAD_LETTER'
    redis.call('LPUSH', KEYS[4], task.id)
  else
    task.status = 'RETRY_WAIT'
    local backoff = math.min(60000, 1000 * (2 ^ (task.attempts - 1)))
    redis.call('ZADD', KEYS[3], now + backoff, task.id)
  end
end
redis.call('HSET', KEYS[1], task.id, cjson.encode(task))
return {task.status, cjson.encode(task)}
`;

export const RECOVER_READ_LUA = String.raw`
local clock = redis.call('TIME')
local now = tonumber(clock[1]) * 1000 + math.floor(tonumber(clock[2]) / 1000)
local count = tonumber(ARGV[1])
local expired = redis.call('ZRANGEBYSCORE', KEYS[2], '-inf', now, 'LIMIT', 0, count)
local recovered = 0
for _, id in ipairs(expired) do
  redis.call('ZREM', KEYS[2], id)
  local raw = redis.call('HGET', KEYS[1], id)
  if raw then
    local task = cjson.decode(raw)
    if task.status == 'RUNNING' and task.leaseUntilMs <= now then
      task.leaseToken = cjson.null
      task.leaseUntilMs = cjson.null
      task.claimedBy = cjson.null
      task.errorCode = 'LEASE_EXPIRED'
      if task.attempts >= task.maxAttempts or tonumber(task.deadlineMs) <= now then
        task.status = 'DEAD_LETTER'
        redis.call('LPUSH', KEYS[5], id)
      else
        task.status = 'RETRY_WAIT'
        redis.call('ZADD', KEYS[3], now + 1000, id)
      end
      redis.call('HSET', KEYS[1], id, cjson.encode(task))
      recovered = recovered + 1
    end
  end
end
local due = redis.call('ZRANGEBYSCORE', KEYS[3], '-inf', now, 'LIMIT', 0, count)
local released = 0
for _, id in ipairs(due) do
  redis.call('ZREM', KEYS[3], id)
  local raw = redis.call('HGET', KEYS[1], id)
  if raw then
    local task = cjson.decode(raw)
    if task.status == 'RETRY_WAIT' then
      if tonumber(task.deadlineMs) <= now then
        task.status = 'DEAD_LETTER'
        task.errorCode = 'DEADLINE_EXPIRED'
        redis.call('LPUSH', KEYS[5], id)
      else
        task.status = 'QUEUED'
        redis.call('RPUSH', KEYS[4], id)
        released = released + 1
      end
      redis.call('HSET', KEYS[1], id, cjson.encode(task))
    end
  end
end
return {recovered, released}
`;

export const CANCEL_READ_LUA = String.raw`
local raw = redis.call('HGET', KEYS[1], ARGV[1])
if not raw then return {'NOT_FOUND', ''} end
local task = cjson.decode(raw)
if task.status == 'COMPLETED' or task.status == 'DEAD_LETTER' or task.status == 'CANCELLED' then
  return {task.status, raw}
end
task.status = 'CANCELLED'
task.leaseToken = cjson.null
task.leaseUntilMs = cjson.null
task.claimedBy = cjson.null
redis.call('ZREM', KEYS[2], task.id)
redis.call('ZREM', KEYS[3], task.id)
redis.call('HSET', KEYS[1], task.id, cjson.encode(task))
return {'CANCELLED', cjson.encode(task)}
`;

const clone = x => structuredClone(x);
function validateReadJob(input) {
  if (!input || !isId(input.id) || !isId(input.principal) || !CAPABILITY.test(input.capability || ''))
    throw new TypeError('valid_read_job_fields_required');
  if (input.dataClass !== 'public' || input.kind !== 'read' || input.parameters && Object.keys(input.parameters).length)
    throw new Error('read_only_public_empty_parameters_required');
  if (!Number.isSafeInteger(input.deadlineMs) || input.deadlineMs < 1 || !Number.isInteger(input.maxAttempts) || input.maxAttempts < 1 || input.maxAttempts > 5)
    throw new TypeError('valid_deadline_and_attempt_budget_required');
  const allowed = ['id', 'principal', 'capability', 'kind', 'dataClass', 'deadlineMs', 'maxAttempts', 'parameters'];
  if (Object.keys(input).some(k => !allowed.includes(k))) throw new TypeError('unexpected_job_fields');
  const item = { id: input.id, principal: input.principal, capability: input.capability, kind: 'read', dataClass: 'public',
    deadlineMs: input.deadlineMs, maxAttempts: input.maxAttempts, parameters: {} };
  return { ...item, requestDigest: digest(item), status: 'QUEUED', attempts: 0, generation: 0,
    claimedBy: null, leaseToken: null, leaseUntilMs: null, errorCode: null, provider: null, resultDigest: null };
}

export function createFencedReadQueue({ url = process.env.UPSTASH_REDIS_REST_URL, token = process.env.UPSTASH_REDIS_REST_TOKEN,
  prefix = 'neo:{chords}:v1', fetchImpl = fetch } = {}) {
  if (!url || !token || typeof fetchImpl !== 'function') throw new Error('chords_redis_connection_required');
  if (!/^[A-Za-z0-9:{}_-]{1,96}$/.test(prefix) || !prefix.includes('{chords}')) throw new TypeError('invalid_chords_queue_namespace');
  const keys = { tasks: `${prefix}:tasks`, queued: `${prefix}:queued`, enabled: `${prefix}:enabled`,
    leases: `${prefix}:leases`, delayed: `${prefix}:delayed`, dead: `${prefix}:dead` };
  async function command(args) {
    const res = await fetchImpl(url.replace(/\/$/, ''), { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify(args) });
    if (!res.ok) throw new Error('chords_queue_transport_failed');
    const json = await res.json();
    if (json.error) throw new Error('chords_queue_redis_failed');
    return json.result;
  }
  async function script(lua, keynames, args) { return command(['EVAL', lua, keynames.length, ...keynames, ...args]); }
  function checkLease(lease) {
    if (!lease || !isId(lease.id) || !isId(lease.workerId) || !isId(lease.leaseToken) || !Number.isSafeInteger(lease.generation))
      throw new TypeError('valid_fenced_claim_required');
  }
  return Object.freeze({
    mode: 'redis-fenced', durable: true,
    async enqueue(input) {
      const task = validateReadJob(input);
      const [status, raw] = await script(ADMIT_READ_LUA, [keys.tasks, keys.queued], [task.id, JSON.stringify(task)]);
      if (!['QUEUED', 'EXISTS'].includes(status)) throw new Error('chords_enqueue_failed');
      const existing = JSON.parse(raw);
      if (existing.requestDigest !== task.requestDigest) throw new Error('job_id_content_collision');
      return { status: status === 'EXISTS' ? 'DUPLICATE' : status, task: clone(existing) };
    },
    async claim({ workerId, leaseMs = 30000 } = {}) {
      if (!isId(workerId) || !Number.isSafeInteger(leaseMs) || leaseMs < 1000 || leaseMs > 300000) throw new TypeError('invalid_worker_lease');
      const leaseToken = randomUUID();
      const [status, raw] = await script(CLAIM_READ_LUA, [keys.tasks, keys.queued, keys.enabled, keys.leases, keys.dead], [leaseToken, workerId, String(leaseMs)]);
      return status === 'CLAIMED' ? { status, task: JSON.parse(raw), claim: { id: JSON.parse(raw).id, workerId, leaseToken, generation: JSON.parse(raw).generation } } : { status };
    },
    async complete(claim, { resultDigest, provider } = {}) {
      checkLease(claim);
      if (!SHA.test(resultDigest || '') || !isId(provider)) throw new TypeError('valid_result_evidence_required');
      const [status] = await script(SETTLE_READ_LUA, [keys.tasks, keys.leases, keys.delayed, keys.dead], [claim.id, claim.leaseToken, String(claim.generation), 'COMPLETE', resultDigest, provider]);
      return { status };
    },
    async fail(claim, code = 'READ_WORKER_FAILED') {
      checkLease(claim);
      if (!/^[A-Z_]{3,48}$/.test(code)) throw new TypeError('safe_error_code_required');
      const [status] = await script(SETTLE_READ_LUA, [keys.tasks, keys.leases, keys.delayed, keys.dead], [claim.id, claim.leaseToken, String(claim.generation), 'FAIL', code, '']);
      return { status };
    },
    async recover({ batch = 50 } = {}) {
      if (!Number.isInteger(batch) || batch < 1 || batch > 100) throw new TypeError('invalid_recovery_batch');
      const [expired, released] = await script(RECOVER_READ_LUA, [keys.tasks, keys.leases, keys.delayed, keys.queued, keys.dead], [String(batch)]);
      return { expired: Number(expired), released: Number(released) };
    },
    async cancel(id) {
      if (!isId(id)) throw new TypeError('invalid_task_id');
      const [status] = await script(CANCEL_READ_LUA, [keys.tasks, keys.leases, keys.delayed], [id]);
      return { status };
    },
    async status(id) {
      if (!isId(id)) throw new TypeError('invalid_task_id');
      const raw = await command(['HGET', keys.tasks, id]);
      if (!raw) return null;
      const task = JSON.parse(raw);
      // Never expose bearer credentials or claim tokens on status endpoints.
      delete task.leaseToken;
      return task;
    },
    async health() {
      const enabled = await command(['GET', keys.enabled]);
      return { mode: 'redis-fenced', enabled: enabled === '1', durable: true };
    }
  });
}

export function createReadJobRunner({ queue, readWorker, workerId, leaseMs = 30000, timeoutMs = 20000 } = {}) {
  if (!queue || !['claim', 'complete', 'fail'].every(k => typeof queue[k] === 'function')) throw new TypeError('fenced_queue_required');
  if (!readWorker || typeof readWorker.run !== 'function' || !isId(workerId)) throw new TypeError('read_worker_required');
  if (!Number.isSafeInteger(timeoutMs) || timeoutMs < 100 || timeoutMs + 5000 > leaseMs) throw new TypeError('timeout_must_precede_lease_expiration');
  let running = false;
  return Object.freeze({
    async runOnce() {
      if (running) return { status: 'BUSY' };
      running = true;
      let externalPending = false;
      try {
        const taken = await queue.claim({ workerId, leaseMs });
        if (taken.status !== 'CLAIMED') return { status: taken.status };
        const { task, claim } = taken;
        // This is deliberately only read-only; no arbitrary prompts or actions.
        // Timeout does not cancel a third-party request. In that case the lease
        // expires and recovery may safely repeat a read, but not a mutation.
        let timeout;
        let externalSettled = false;
        const timed = Symbol('timeout');
        try {
          const call = Promise.resolve().then(() => readWorker.run({ capability: task.capability, dataClass: 'public', parameters: {} }));
          // A timed-out request may still be executing at the provider. Retain
          // the local busy guard until it really settles; the lease remains open
          // for external fenced recovery.
          call.then(() => { externalSettled = true; if (externalPending) running = false; },
            () => { externalSettled = true; if (externalPending) running = false; });
          const result = await Promise.race([
            call,
            new Promise(resolve => { timeout = setTimeout(() => resolve(timed), timeoutMs); })
          ]);
          if (result === timed) {
            externalPending = !externalSettled;
            return { status: 'TIMED_OUT_LEASE_OPEN', taskId: task.id };
          }
          if (result?.readOnly !== true || result?.capability !== task.capability || !isId(result.provider)) throw Error('invalid_read_evidence');
          const ack = await queue.complete(claim, { resultDigest: digest(result.data), provider: result.provider });
          return { ...ack, taskId: task.id, provider: result.provider };
        } catch {
          const failed = await queue.fail(claim, 'READ_WORKER_FAILED');
          return { ...failed, taskId: task.id };
        } finally { if (timeout) clearTimeout(timeout); }
      } finally { if (!externalPending) running = false; }
    }
  });
}
