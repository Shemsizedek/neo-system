import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, rmSync, chmodSync, statSync, symlinkSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { spawn } from 'node:child_process'
import { once } from 'node:events'
import { DatabaseSync } from 'node:sqlite'
import { createSqliteApprovalStore, isSqliteApprovalStore } from './approval-store.mjs'

const code = expected => error => error.code === expected
const nonceKey = 'neo-nvm/psbt-approval-v1:fixture-operator:' + '01'.repeat(32)
const context = { subjectHash: '11'.repeat(32), approvalKeyHash: '22'.repeat(32), psbtHash: '33'.repeat(32), intentHash: '44'.repeat(32) }
function setup(t, options = {}) {
  const directory = mkdtempSync(join(tmpdir(), 'neo-vm-store-'))
  const filename = join(directory, 'approvals.sqlite')
  const stores = []
  const open = extra => { const store = createSqliteApprovalStore({ filename, now: () => 1_100, ...options, ...extra }); stores.push(store); return store }
  t.after(() => { for (const store of stores) store.close(); rmSync(directory, { recursive: true, force: true }) })
  return { directory, filename, open }
}
async function worker(t, filename) {
  const child = spawn(process.execPath, ['scripts/test-support/neo-vm-approval-worker.mjs', filename], {
    stdio: ['ignore', 'ignore', 'pipe', 'ipc'], cwd: new URL('../../', import.meta.url),
  })
  t.after(() => { if (child.exitCode === null) child.kill('SIGKILL') })
  let stderr = ''
  child.stderr.on('data', chunk => { stderr += chunk })
  const [ready] = await Promise.race([once(child, 'message'), once(child, 'exit').then(([status]) => { throw Error(`worker exited ${status}: ${stderr}`) })])
  assert.equal(ready.ready, true)
  return async abrupt => {
    const result = once(child, 'message'), finished = once(child, 'exit')
    child.send({ nonceKey, context, abrupt })
    const [message] = await result
    const [status] = await finished
    assert.equal(status, 0, stderr)
    assert.equal(message.error, undefined)
    return message.consumed
  }
}

test('SQLite approval reservation survives close and reopen with hashed audit context', t => {
  const s = setup(t), first = s.open()
  assert.equal(isSqliteApprovalStore(first), true)
  assert.equal(first.consumeApproval(nonceKey, 1_200, context), true)
  first.close()
  const second = s.open()
  assert.equal(second.consumeApproval(nonceKey, 1_200, context), false)
  assert.deepEqual(second.inspect(), { backend: 'sqlite', schemaVersion: 1, journalMode: 'wal', synchronous: 'FULL', consumedApprovals: 1, automaticPruning: false })
  const db = new DatabaseSync(s.filename, { readOnly: true })
  try {
    const row = db.prepare('SELECT * FROM neo_vm_approval_nonces').get()
    assert.equal(row.subject_hash, context.subjectHash)
    assert.equal(row.approval_key_hash, context.approvalKeyHash)
    assert.equal(row.psbt_hash, context.psbtHash)
    assert.equal(row.intent_hash, context.intentHash)
    assert.notEqual(row.nonce_hash, nonceKey)
    assert.equal(row.nonce_hash.length, 64)
    assert.equal(row.consumed_at, 1_100)
    assert.equal(row.expires_at, 1_200)
  } finally { db.close() }
  assert.equal(statSync(s.filename).mode & 0o077, 0)
})

test('six independent processes racing one nonce produce exactly one winner', async t => {
  const s = setup(t); s.open().close()
  const contenders = await Promise.all(Array.from({ length: 6 }, () => worker(t, s.filename)))
  const results = await Promise.all(contenders.map(run => run(false)))
  assert.equal(results.filter(Boolean).length, 1)
  assert.equal(s.open().inspect().consumedApprovals, 1)
})

test('committed reservation survives abrupt process exit without database close', async t => {
  const s = setup(t); s.open().close()
  const run = await worker(t, s.filename)
  assert.equal(await run(true), true)
  assert.equal(s.open().consumeApproval(nonceKey, 1_200, context), false)
})

test('expired rows are retained through restart and clock rollback', t => {
  const s = setup(t), first = s.open()
  assert.equal(first.consumeApproval(nonceKey, 1_200, context), true)
  first.close()
  assert.equal(s.open({ now: () => 1_300 }).consumeApproval(nonceKey, 1_500, context), false)
  assert.equal(s.open({ now: () => 1_100 }).consumeApproval(nonceKey, 1_200, context), false)
})

test('approval storage rejects ephemeral paths, unsafe files and corrupt databases', t => {
  const s = setup(t)
  for (const filename of [undefined, '', ':memory:', 'relative.sqlite', 'file:approvals?mode=memory', s.directory + '/']) {
    assert.throws(() => createSqliteApprovalStore({ filename }), code('PSBT_APPROVAL_DATABASE_PATH_REQUIRED'))
  }
  writeFileSync(s.filename, 'not a database', { mode: 0o600 })
  assert.throws(() => s.open(), code('PSBT_APPROVAL_STORE_UNAVAILABLE'))
  rmSync(s.filename)
  const target = join(s.directory, 'target.sqlite')
  writeFileSync(target, '', { mode: 0o600 }); symlinkSync(target, s.filename)
  assert.throws(() => s.open(), code('PSBT_APPROVAL_STORE_UNAVAILABLE'))
  rmSync(s.filename); writeFileSync(s.filename, '', { mode: 0o644 }); chmodSync(s.filename, 0o644)
  assert.throws(() => s.open(), code('PSBT_APPROVAL_DATABASE_PERMISSIONS_INVALID'))
})

test('closed or locked stores cannot grant approval and locking never poisons a retry', t => {
  const s = setup(t, { busyTimeoutMs: 10 }), store = s.open(), lock = new DatabaseSync(s.filename)
  try {
    lock.exec('BEGIN IMMEDIATE')
    assert.throws(() => store.consumeApproval(nonceKey, 1_200, context), code('PSBT_APPROVAL_STORE_UNAVAILABLE'))
    lock.exec('ROLLBACK')
    assert.equal(store.inspect().consumedApprovals, 0)
    assert.equal(store.consumeApproval(nonceKey, 1_200, context), true)
  } finally { lock.close() }
  store.close()
  assert.throws(() => store.consumeApproval(nonceKey, 1_200, context), code('PSBT_APPROVAL_STORE_CLOSED'))
})

test('invalid clocks, expiry windows, nonce keys and audit context never write a row', t => {
  const s = setup(t), store = s.open()
  for (const expires of [1_100, 1_099, 1_401, 1_200.5, NaN, '1200']) assert.throws(() => store.consumeApproval(nonceKey, expires, context), code('PSBT_APPROVAL_STORE_EXPIRY_INVALID'))
  assert.throws(() => s.open({ now: () => NaN }).consumeApproval(nonceKey, 1_200, context), code('PSBT_APPROVAL_STORE_EXPIRY_INVALID'))
  assert.throws(() => store.consumeApproval('nonce', 1_200, context), code('PSBT_APPROVAL_NONCE_INVALID'))
  assert.throws(() => store.consumeApproval(nonceKey, 1_200, { ...context, psbtHash: 'invalid' }), code('PSBT_APPROVAL_AUDIT_CONTEXT_INVALID'))
  assert.equal(store.inspect().consumedApprovals, 0)
})

test('schema versions newer than the supported approval store fail closed', t => {
  const s = setup(t); s.open().close()
  const db = new DatabaseSync(s.filename)
  db.exec('UPDATE neo_vm_approval_meta SET version=2'); db.close()
  assert.throws(() => s.open(), code('PSBT_APPROVAL_DATABASE_INVALID'))
  assert.equal(isSqliteApprovalStore({ consumeApproval: () => true }), false)
})
