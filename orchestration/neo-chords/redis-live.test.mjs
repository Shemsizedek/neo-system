/**
 * Actual Redis Lua tests (ephemeral GitHub Actions Redis 7 service).
 * Never touches production Redis or any provider API.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { connect } from 'node:net';
import { createFencedReadQueue, createReadJobRunner } from './fenced-queue.mjs';

const enabled = process.env.NEO_CHORDS_TEST_REDIS === '1';
const prefix = 'neo:{chords}:gate5:ci';
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

function toResp(args) {
  const chunks = [Buffer.from('*' + args.length + '\r\n')];
  for (const value of args) {
    const v = Buffer.from(String(value));
    chunks.push(Buffer.from('$' + v.length + '\r\n'), v, Buffer.from('\r\n'));
  }
  return Buffer.concat(chunks);
}
function parseReply(buffer, offset = 0) {
  if (offset >= buffer.length) return null;
  const stop = buffer.indexOf('\r\n', offset);
  if (stop < 0) return null;
  const type = String.fromCharCode(buffer[offset]);
  const header = buffer.toString('utf8', offset + 1, stop);
  let pos = stop + 2;
  if (type === '-') throw new Error('redis_error:' + header);
  if (type === '+' || type === ':') return { value: type === ':' ? Number(header) : header, pos };
  if (type === '$') {
    const len = Number(header);
    if (len === -1) return { value: null, pos };
    if (buffer.length < pos + len + 2) return null;
    return { value: buffer.toString('utf8', pos, pos + len), pos: pos + len + 2 };
  }
  if (type === '*') {
    const count = Number(header);
    if (count === -1) return { value: null, pos };
    const values = [];
    for (let i = 0; i < count; i++) {
      const part = parseReply(buffer, pos);
      if (!part) return null;
      values.push(part.value);
      pos = part.pos;
    }
    return { value: values, pos };
  }
  throw new Error('unexpected_RESP_type');
}
function redis(...args) {
  return new Promise((resolve, reject) => {
    const socket = connect({ host: '127.0.0.1', port: 6379 });
    let settled = false, buffer = Buffer.alloc(0);
    const timeout = setTimeout(() => finish(new Error('local_redis_timeout')), 10000);
    function finish(error, value) {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      socket.destroy();
      if (error) reject(error); else resolve(value);
    }
    socket.on('connect', () => socket.write(toResp(args)));
    socket.on('data', chunk => {
      buffer = Buffer.concat([buffer, chunk]);
      try { const reply = parseReply(buffer); if (reply) finish(null, reply.value); }
      catch (e) { finish(e); }
    });
    socket.on('error', e => finish(e));
    socket.on('end', () => { if (!settled) finish(new Error('redis_closed_early')); });
  });
}
async function localRedisFetch(_url, req) {
  return { ok: true, json: async () => ({ result: await redis(...JSON.parse(req.body)) }) };
}
function queue() {
  return createFencedReadQueue({
    url: 'http://127.0.0.1:6379/ci-only',
    token: 'fake-test-only',
    prefix,
    fetchImpl: localRedisFetch
  });
}
function job(id, extra = {}) {
  return {
    id, principal: 'ci-operator', kind: 'read', dataClass: 'public',
    capability: 'development.repositories.list', parameters: {},
    deadlineMs: Date.now() + 120000, maxAttempts: 3, ...extra
  };
}
test('Redis 7 EVAL: paused by default, concurrent claims and token fencing', { skip: !enabled }, async () => {
  assert.equal(await redis('PING'), 'PONG');
  const q = queue();
  assert.equal((await q.enqueue(job('live-claim-1'))).status, 'QUEUED');
  assert.equal((await q.claim({ workerId: 'worker-a', leaseMs: 2000 })).status, 'PAUSED');
  await redis('SET', prefix + ':enabled', '1');
  const claims = await Promise.all([
    q.claim({ workerId: 'worker-a', leaseMs: 2000 }),
    q.claim({ workerId: 'worker-b', leaseMs: 2000 })
  ]);
  assert.equal(claims.filter(c => c.status === 'CLAIMED').length, 1);
  const taken = claims.find(c => c.status === 'CLAIMED');
  assert.equal((await q.complete({ ...taken.claim, leaseToken: 'forged' }, { resultDigest: 'a'.repeat(64), provider: 'ci-worker' })).status, 'STALE_CLAIM');
  assert.equal((await q.complete(taken.claim, { resultDigest: 'b'.repeat(64), provider: 'ci-worker' })).status, 'COMPLETED');
  assert.equal((await q.status('live-claim-1')).leaseToken, undefined);
});

test('Redis 7 EVAL: expired lease recovery and stale claim rejection', { skip: !enabled }, async () => {
  const q = queue();
  await q.enqueue(job('live-recover-1', { maxAttempts: 1 }));
  const taken = await q.claim({ workerId: 'worker-crashed', leaseMs: 1000 });
  assert.equal(taken.status, 'CLAIMED');
  await sleep(1150);
  assert.equal((await q.recover()).expired, 1);
  assert.equal((await q.complete(taken.claim, { resultDigest: 'a'.repeat(64), provider: 'ci-worker' })).status, 'STALE_CLAIM');
  assert.equal((await q.status('live-recover-1')).status, 'DEAD_LETTER');
});

test('Redis 7 EVAL: cancel and bounded mock read produce a persisted digest', { skip: !enabled }, async () => {
  const q = queue();
  await q.enqueue(job('live-cancel-1'));
  const taken = await q.claim({ workerId: 'worker-c', leaseMs: 3000 });
  assert.equal(taken.status, 'CLAIMED');
  assert.equal((await q.cancel('live-cancel-1')).status, 'CANCELLED');
  assert.equal((await q.complete(taken.claim, { resultDigest: 'a'.repeat(64), provider: 'ci-worker' })).status, 'STALE_CLAIM');
  await q.enqueue(job('live-run-1'));
  const runner = createReadJobRunner({
    queue: q, workerId: 'worker-r', leaseMs: 5000, timeoutMs: 500,
    readWorker: {
      async run({ capability, dataClass, parameters }) {
        assert.equal(dataClass, 'public');
        assert.deepEqual(parameters, {});
        return { capability, readOnly: true, provider: 'ci-worker', data: { demo: true } };
      }
    }
  });
  assert.equal((await runner.runOnce()).status, 'COMPLETED');
  const state = await q.status('live-run-1');
  assert.equal(state.status, 'COMPLETED');
  assert.match(state.resultDigest, /^[a-f0-9]{64}$/);
  await redis('SET', prefix + ':enabled', '0');
  assert.equal((await q.claim({ workerId: 'worker-r' })).status, 'PAUSED');
});
