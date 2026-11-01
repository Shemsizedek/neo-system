import { DatabaseSync } from 'node:sqlite'
import { constants, openSync, closeSync, fstatSync, mkdirSync } from 'node:fs'
import { dirname, isAbsolute } from 'node:path'
import { sha256Hex } from '../../core/neo-bvm/runtime.mjs'
import { requireFields, VmInputError } from '../../core/neo-bvm/input.mjs'

const stores = new WeakSet()
const fail = code => { throw new VmInputError(code) }
const HASH = /^[0-9a-f]{64}$/
const NONCE_KEY = /^neo-nvm\/psbt-approval-v1:[A-Za-z0-9][A-Za-z0-9._:-]{0,79}:[0-9a-f]{64}$/
export const isSqliteApprovalStore = value => stores.has(value)

/** Dedicated local-disk store. Never substitute an in-memory replay cache. */
export function createSqliteApprovalStore({ filename, now = () => Math.floor(Date.now() / 1000), busyTimeoutMs = 5_000 } = {}) {
  if (typeof filename !== 'string' || !isAbsolute(filename) || filename.includes('\0') || filename.endsWith('/')) fail('PSBT_APPROVAL_DATABASE_PATH_REQUIRED')
  if (typeof now !== 'function' || !Number.isSafeInteger(busyTimeoutMs) || busyTimeoutMs < 1 || busyTimeoutMs > 5_000) fail('PSBT_APPROVAL_STORE_CONFIGURATION_INVALID')
  let db
  try {
    mkdirSync(dirname(filename), { recursive: true, mode: 0o700 })
    // The containing directory is operator-controlled. Do not follow a final
    // symlink, open a device, or silently reuse a broadly readable database.
    const fd = openSync(filename, constants.O_CREAT | constants.O_RDWR | constants.O_NOFOLLOW, 0o600)
    try {
      const stat = fstatSync(fd)
      if (!stat.isFile() || (stat.mode & 0o077) !== 0) fail('PSBT_APPROVAL_DATABASE_PERMISSIONS_INVALID')
    } finally { closeSync(fd) }
    db = new DatabaseSync(filename, { timeout: busyTimeoutMs, enableDoubleQuotedStringLiterals: false, allowExtension: false })
    db.exec('PRAGMA journal_mode=WAL; PRAGMA synchronous=FULL; PRAGMA trusted_schema=OFF;')
    if (db.prepare('PRAGMA journal_mode').get().journal_mode !== 'wal' || db.prepare('PRAGMA synchronous').get().synchronous !== 2) fail('PSBT_APPROVAL_DURABILITY_REQUIRED')
    db.exec(`
      CREATE TABLE IF NOT EXISTS neo_vm_approval_meta (
        singleton INTEGER PRIMARY KEY CHECK (singleton=1), version INTEGER NOT NULL
      ) STRICT;
      INSERT INTO neo_vm_approval_meta VALUES (1,1) ON CONFLICT(singleton) DO NOTHING;
      CREATE TABLE IF NOT EXISTS neo_vm_approval_nonces (
        nonce_hash TEXT PRIMARY KEY CHECK (length(nonce_hash)=64),
        consumed_at INTEGER NOT NULL, expires_at INTEGER NOT NULL CHECK (expires_at>consumed_at),
        subject_hash TEXT NOT NULL CHECK (length(subject_hash)=64),
        approval_key_hash TEXT NOT NULL CHECK (length(approval_key_hash)=64),
        psbt_hash TEXT NOT NULL CHECK (length(psbt_hash)=64),
        intent_hash TEXT NOT NULL CHECK (length(intent_hash)=64)
      ) STRICT;
    `)
    if (db.prepare('SELECT version FROM neo_vm_approval_meta WHERE singleton=1').get()?.version !== 1 || db.prepare('PRAGMA quick_check').get().quick_check !== 'ok') fail('PSBT_APPROVAL_DATABASE_INVALID')
    const insert = db.prepare(`INSERT INTO neo_vm_approval_nonces
      (nonce_hash,consumed_at,expires_at,subject_hash,approval_key_hash,psbt_hash,intent_hash)
      VALUES (?,?,?,?,?,?,?) ON CONFLICT(nonce_hash) DO NOTHING`)
    let closed = false
    const requireOpen = () => { if (closed) fail('PSBT_APPROVAL_STORE_CLOSED') }
    const store = Object.freeze({
      consumeApproval(nonceKey, expiresAt, context) {
        requireOpen()
        if (typeof nonceKey !== 'string' || !NONCE_KEY.test(nonceKey)) fail('PSBT_APPROVAL_NONCE_INVALID')
        requireFields(context, ['subjectHash', 'approvalKeyHash', 'psbtHash', 'intentHash'])
        if (Object.values(context).some(value => typeof value !== 'string' || !HASH.test(value))) fail('PSBT_APPROVAL_AUDIT_CONTEXT_INVALID')
        const timestamp = now()
        if (!Number.isSafeInteger(timestamp) || timestamp < 0 || !Number.isSafeInteger(expiresAt) || expiresAt <= timestamp || expiresAt - timestamp > 300) fail('PSBT_APPROVAL_STORE_EXPIRY_INVALID')
        try {
          // One autocommit INSERT and a database primary key arbitrate across
          // independent processes. No read-then-write or process-local lock.
          return insert.run(sha256Hex(Buffer.from(nonceKey)), timestamp, expiresAt,
            context.subjectHash, context.approvalKeyHash, context.psbtHash, context.intentHash).changes === 1
        } catch { fail('PSBT_APPROVAL_STORE_UNAVAILABLE') }
      },
      inspect() {
        requireOpen()
        return Object.freeze({ backend: 'sqlite', schemaVersion: 1, journalMode: 'wal', synchronous: 'FULL',
          consumedApprovals: db.prepare('SELECT COUNT(*) AS count FROM neo_vm_approval_nonces').get().count,
          automaticPruning: false })
      },
      close() { if (!closed) { db.close(); closed = true } },
    })
    stores.add(store)
    return store
  } catch (error) {
    db?.close()
    if (error instanceof VmInputError) throw error
    fail('PSBT_APPROVAL_STORE_UNAVAILABLE')
  }
}
