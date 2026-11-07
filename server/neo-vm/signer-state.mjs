import { requireFields, VmInputError } from '../../core/neo-bvm/input.mjs'
import { sha256Hex } from '../../core/neo-bvm/runtime.mjs'

const fail = code => { throw new VmInputError(code) }
const HASH = /^[0-9a-f]{64}$/
const hash = value => sha256Hex(Buffer.from(value))
const transitions = { PREPARED: ['DISPATCHED', 'CANCELLED'], DISPATCHED: ['RESPONSE_VERIFIED', 'UNRESOLVED'], RESPONSE_VERIFIED: ['VALIDATED', 'UNRESOLVED'], VALIDATED: ['UNRESOLVED'] }

// Internal extension of the existing approval database. The public pairing and
// workflow authorities validate cryptographic proofs before using these methods.
export function installSignerState(db, now, requireOpen) {
  db.exec(`
    PRAGMA foreign_keys=ON;
    CREATE TABLE IF NOT EXISTS neo_vm_signer_state_meta (singleton INTEGER PRIMARY KEY CHECK(singleton=1),version INTEGER NOT NULL) STRICT;
    INSERT INTO neo_vm_signer_state_meta VALUES(1,1) ON CONFLICT(singleton) DO NOTHING;
    CREATE TABLE IF NOT EXISTS neo_vm_pairing_nonces (nonce_hash TEXT PRIMARY KEY,consumed_at INTEGER NOT NULL) STRICT;
    CREATE TABLE IF NOT EXISTS neo_vm_pairing_challenges (
      id TEXT PRIMARY KEY,owner_hash TEXT NOT NULL,signer_id TEXT NOT NULL,expires_at INTEGER NOT NULL,used INTEGER NOT NULL DEFAULT 0 CHECK(used IN(0,1)),record_json TEXT NOT NULL
    ) STRICT;
    CREATE TABLE IF NOT EXISTS neo_vm_signer_pairings (
      id TEXT PRIMARY KEY,owner_hash TEXT NOT NULL,signer_id TEXT NOT NULL,status TEXT NOT NULL CHECK(status IN('ACTIVE','REVOKED','EXPIRED')),
      expires_at INTEGER NOT NULL,record_json TEXT NOT NULL,revoked_at INTEGER
    ) STRICT;
    CREATE UNIQUE INDEX IF NOT EXISTS neo_vm_one_active_signer ON neo_vm_signer_pairings(signer_id) WHERE status='ACTIVE';
    CREATE TABLE IF NOT EXISTS neo_vm_signing_attempts (
      id TEXT PRIMARY KEY,owner_hash TEXT NOT NULL,pairing_id TEXT NOT NULL REFERENCES neo_vm_signer_pairings(id),request_hash TEXT NOT NULL,
      status TEXT NOT NULL CHECK(status IN('PREPARED','DISPATCHED','RESPONSE_VERIFIED','VALIDATED','UNRESOLVED','CANCELLED')),
      created_at INTEGER NOT NULL,updated_at INTEGER NOT NULL,record_json TEXT NOT NULL
    ) STRICT;
    CREATE TABLE IF NOT EXISTS neo_vm_signing_events (
      attempt_id TEXT NOT NULL REFERENCES neo_vm_signing_attempts(id),seq INTEGER NOT NULL,stage TEXT NOT NULL,occurred_at INTEGER NOT NULL,
      metadata_json TEXT NOT NULL,previous_hash TEXT NOT NULL,event_hash TEXT NOT NULL,PRIMARY KEY(attempt_id,seq)
    ) STRICT;
  `)
  if (db.prepare('SELECT version FROM neo_vm_signer_state_meta WHERE singleton=1').get()?.version !== 1) fail('SIGNER_STATE_SCHEMA_UNSUPPORTED')
  const timestamp = () => { const t = now(); if (!Number.isSafeInteger(t) || t < 0) fail('SIGNER_STATE_CLOCK_INVALID'); return t }
  const hashes = (...values) => { if (values.some(v => typeof v !== 'string' || !HASH.test(v))) fail('SIGNER_STATE_IDENTIFIER_INVALID') }
  const json = record => { const text = JSON.stringify(record); if (Buffer.byteLength(text) > 24_000) fail('SIGNER_STATE_RECORD_TOO_LARGE'); return text }
  const action = callback => {
    requireOpen()
    try { return callback() } catch (error) { if (error instanceof VmInputError) throw error; fail('SIGNER_STATE_UNAVAILABLE') }
  }
  const transaction = callback => action(() => {
    db.exec('BEGIN IMMEDIATE')
    try { const result = callback(); db.exec('COMMIT'); return result }
    catch (error) { db.exec('ROLLBACK'); throw error }
  })
  const consume = nonceKey => {
    if (typeof nonceKey !== 'string' || nonceKey.length > 240 || !/^neo-nvm\/pairing-(approval|revoke)-v1:[A-Za-z0-9._:-]+:[0-9a-f]{64}$/.test(nonceKey)) fail('PAIRING_NONCE_INVALID')
    if (db.prepare('INSERT INTO neo_vm_pairing_nonces VALUES(?,?) ON CONFLICT(nonce_hash) DO NOTHING').run(hash(nonceKey), timestamp()).changes !== 1) fail('PAIRING_APPROVAL_REPLAYED')
  }
  const active = (id, ownerHash) => {
    const row = db.prepare('SELECT * FROM neo_vm_signer_pairings WHERE id=? AND owner_hash=?').get(id, ownerHash)
    if (!row || row.status !== 'ACTIVE' || row.expires_at <= timestamp()) fail('PAIRING_NOT_ACTIVE')
    return row
  }
  const metadata = value => {
    if (!value || typeof value !== 'object' || ![Object.prototype, null].includes(Object.getPrototypeOf(value))) fail('SIGNER_AUDIT_METADATA_INVALID')
    const hashFields = ['requestHash','psbtHash','intentHash','rawTransactionHash','txid','wtxid','blockHash']
    for (const key of Reflect.ownKeys(value)) {
      if (hashFields.includes(key)) hashes(value[key])
      else if (key === 'feeSats') { if (!Number.isSafeInteger(value[key]) || value[key] < 1 || value[key] > 100_000) fail('SIGNER_AUDIT_METADATA_INVALID') }
      else if (key === 'reasonCode') { if (typeof value[key] !== 'string' || !/^[A-Z][A-Z0-9_]{0,79}$/.test(value[key])) fail('SIGNER_AUDIT_METADATA_INVALID') }
      else fail('SIGNER_AUDIT_METADATA_INVALID')
    }
    return json(value)
  }
  const append = (id, stage, details, time) => {
    const last = db.prepare('SELECT seq,event_hash FROM neo_vm_signing_events WHERE attempt_id=? ORDER BY seq DESC LIMIT 1').get(id)
    const seq = (last?.seq ?? 0) + 1, previousHash = last?.event_hash ?? '0'.repeat(64), text = metadata(details)
    const eventHash = hash(`neo-nvm/signing-event-v1\0${JSON.stringify({ id,seq,stage,time,metadataJson:text,previousHash })}`)
    db.prepare('INSERT INTO neo_vm_signing_events VALUES(?,?,?,?,?,?,?)').run(id,seq,stage,time,text,previousHash,eventHash)
  }
  const attempt = (id, ownerHash) => db.prepare('SELECT * FROM neo_vm_signing_attempts WHERE id=? AND owner_hash=?').get(id,ownerHash)
  const view = row => row ? Object.freeze({ ...JSON.parse(row.record_json),status:row.status,createdAt:row.created_at,updatedAt:row.updated_at,
    signatureMayExist: ['DISPATCHED','RESPONSE_VERIFIED','VALIDATED','UNRESOLVED'].includes(row.status) }) : null
  return Object.freeze({
    savePairingChallenge(record, nonceKey) {
      hashes(record.challengeId,record.ownerHash,record.proposalHash)
      const text = json(record)
      return transaction(() => {
        if (record.expiresAt <= timestamp()) fail('PAIRING_CHALLENGE_EXPIRED')
        consume(nonceKey)
        db.prepare('INSERT INTO neo_vm_pairing_challenges(id,owner_hash,signer_id,expires_at,record_json) VALUES(?,?,?,?,?)').run(record.challengeId,record.ownerHash,record.proposal.signerId,record.expiresAt,text)
      })
    },
    getPairingChallenge(id, ownerHash) {
      hashes(id,ownerHash)
      return action(() => { const row = db.prepare('SELECT * FROM neo_vm_pairing_challenges WHERE id=? AND owner_hash=?').get(id,ownerHash); return row ? { ...JSON.parse(row.record_json),used:row.used === 1 } : null })
    },
    activatePairing(record) {
      hashes(record.pairingId,record.ownerHash)
      const text = json(record)
      return transaction(() => {
        const time = timestamp()
        if (record.expiresAt <= time || db.prepare('UPDATE neo_vm_pairing_challenges SET used=1 WHERE id=? AND owner_hash=? AND used=0 AND expires_at>?').run(record.pairingId,record.ownerHash,time).changes !== 1) fail('PAIRING_CHALLENGE_USED_OR_EXPIRED')
        db.prepare("UPDATE neo_vm_signer_pairings SET status='EXPIRED' WHERE signer_id=? AND status='ACTIVE' AND expires_at<=?").run(record.signerId,time)
        if (db.prepare("SELECT id FROM neo_vm_signer_pairings WHERE signer_id=? AND status='ACTIVE'").get(record.signerId)) fail('PAIRING_SIGNER_ALREADY_ACTIVE')
        db.prepare("INSERT INTO neo_vm_signer_pairings(id,owner_hash,signer_id,status,expires_at,record_json) VALUES(?,?,?,'ACTIVE',?,?)").run(record.pairingId,record.ownerHash,record.signerId,record.expiresAt,text)
      })
    },
    getSignerPairing(id, ownerHash) {
      hashes(id,ownerHash)
      return action(() => { const row = db.prepare('SELECT * FROM neo_vm_signer_pairings WHERE id=? AND owner_hash=?').get(id,ownerHash); return row ? { ...JSON.parse(row.record_json),status:row.status,revokedAt:row.revoked_at } : null })
    },
    revokeSignerPairing(id, ownerHash, nonceKey) {
      hashes(id,ownerHash)
      return transaction(() => { active(id,ownerHash); consume(nonceKey); db.prepare("UPDATE neo_vm_signer_pairings SET status='REVOKED',revoked_at=? WHERE id=? AND owner_hash=?").run(timestamp(),id,ownerHash) })
    },
    prepareSigningAttempt(record) {
      requireFields(record,['requestId','requestHash','pairingId','ownerHash','psbtHash','intentHash'])
      hashes(...Object.values(record))
      const text = json(record)
      return transaction(() => { active(record.pairingId,record.ownerHash); const time = timestamp();
        db.prepare("INSERT INTO neo_vm_signing_attempts VALUES(?,?,?,?,'PREPARED',?,?,?)").run(record.requestId,record.ownerHash,record.pairingId,record.requestHash,time,time,text)
        append(record.requestId,'PREPARED',{requestHash:record.requestHash,psbtHash:record.psbtHash,intentHash:record.intentHash},time)
      })
    },
    advanceSigningAttempt(id, ownerHash, stage, details = {}) {
      hashes(id,ownerHash); metadata(details)
      return transaction(() => { const row = attempt(id,ownerHash); if (!row || !transitions[row.status]?.includes(stage)) fail('SIGNER_AUDIT_TRANSITION_INVALID')
        if (stage === 'DISPATCHED') active(row.pairing_id,ownerHash)
        const time = timestamp(); if (time < row.updated_at) fail('SIGNER_STATE_CLOCK_ROLLBACK')
        append(id,stage,details,time); db.prepare('UPDATE neo_vm_signing_attempts SET status=?,updated_at=? WHERE id=?').run(stage,time,id)
      })
    },
    getSigningAttempt(id, ownerHash) { hashes(id,ownerHash); return action(() => view(attempt(id,ownerHash))) },
    listSigningAttempts(ownerHash, { limit = 50, recoveryOnly = false } = {}) {
      hashes(ownerHash)
      if (!Number.isSafeInteger(limit) || limit < 1 || limit > 100 || typeof recoveryOnly !== 'boolean') fail('SIGNER_AUDIT_QUERY_INVALID')
      return action(() => db.prepare(`SELECT * FROM neo_vm_signing_attempts WHERE owner_hash=? ${recoveryOnly ? "AND status IN('PREPARED','DISPATCHED','RESPONSE_VERIFIED','UNRESOLVED')" : ''} ORDER BY created_at DESC,id DESC LIMIT ?`).all(ownerHash,limit).map(view))
    },
    signingAudit(id, ownerHash) {
      hashes(id,ownerHash)
      return action(() => {
        if (!attempt(id,ownerHash)) return null
        let previousHash = '0'.repeat(64), expectedSeq = 1
        const events = db.prepare('SELECT * FROM neo_vm_signing_events WHERE attempt_id=? ORDER BY seq').all(id)
        for (const e of events) {
          const computed = hash(`neo-nvm/signing-event-v1\0${JSON.stringify({id,seq:e.seq,stage:e.stage,time:e.occurred_at,metadataJson:e.metadata_json,previousHash})}`)
          if (e.seq !== expectedSeq++ || e.previous_hash !== previousHash || e.event_hash !== computed) fail('SIGNER_AUDIT_INTEGRITY_FAILED')
          previousHash = computed
        }
        const row = attempt(id,ownerHash)
        const record=JSON.parse(row.record_json), first=events.length ? JSON.parse(events[0].metadata_json) : null
        if (!events.length || events[0].stage!=='PREPARED' || events.at(-1).stage !== row.status || record.requestId!==row.id || record.ownerHash!==row.owner_hash ||
            record.pairingId!==row.pairing_id || record.requestHash!==row.request_hash || first.requestHash!==record.requestHash || first.psbtHash!==record.psbtHash || first.intentHash!==record.intentHash) fail('SIGNER_AUDIT_INTEGRITY_FAILED')
        return Object.freeze({valid:true,events:events.map(e=>({seq:e.seq,stage:e.stage,occurredAt:e.occurred_at,metadata:JSON.parse(e.metadata_json),eventHash:e.event_hash})),headHash:previousHash})
      })
    },
    inspectSignerState() {
      return action(() => Object.freeze({schemaVersion:1,pairings:db.prepare('SELECT COUNT(*) AS n FROM neo_vm_signer_pairings').get().n,
        attempts:db.prepare('SELECT COUNT(*) AS n FROM neo_vm_signing_attempts').get().n,
        unresolved:db.prepare("SELECT COUNT(*) AS n FROM neo_vm_signing_attempts WHERE status IN('DISPATCHED','RESPONSE_VERIFIED','UNRESOLVED')").get().n}))
    },
  })
}
