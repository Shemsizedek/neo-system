import { randomUUID, createHash } from 'node:crypto'
import { resolve } from 'node:path'
import { createEvidenceVault } from '../neo-evidence-vault/store.mjs'
import { validateEvidenceMetadata } from './evidence.mjs'

const digest = value => createHash('sha256').update(value).digest('hex')
const idPattern = /^[A-Z0-9][A-Z0-9_-]{2,63}$/
const hexPattern = /^[a-f0-9]{64}$/i
export const PRESS_REVIEW_GATES = Object.freeze(['ACCURACY', 'PRIVACY', 'LEGAL_RISK'])

export function createPressCustodyStore({ dbPath, testMemory = false, now = () => new Date() } = {}) {
  if (typeof dbPath !== 'string' || !dbPath.trim() ||
      (dbPath === ':memory:' && !testMemory) ||
      (dbPath !== ':memory:' && resolve(dbPath) === resolve('data/neo-evidence-vault.sqlite'))) {
    throw new Error('dedicated_private_evidence_database_required')
  }
  // This must never be a path mounted by the legacy vault HTTP server.
  // Storage encryption, backup and path isolation require external verification.
  const vault = createEvidenceVault(dbPath)
  const db = vault.db
  db.exec([
    'CREATE TABLE IF NOT EXISTS press_manifest (',
    ' evidence_id TEXT PRIMARY KEY, case_id TEXT NOT NULL, original_sha256 TEXT NOT NULL,',
    ' locator_sha256 TEXT NOT NULL, source_tier TEXT NOT NULL, editorial_state TEXT NOT NULL,',
    ' access_level TEXT NOT NULL, reporter_subject TEXT NOT NULL,',
    ' FOREIGN KEY(evidence_id) REFERENCES evidence_records(id));',
    'CREATE TABLE IF NOT EXISTS press_reviews (',
    ' evidence_id TEXT NOT NULL, gate TEXT NOT NULL, reviewer_subject TEXT NOT NULL,',
    ' decision TEXT NOT NULL, created_at TEXT NOT NULL,',
    ' PRIMARY KEY(evidence_id,gate,reviewer_subject),',
    ' FOREIGN KEY(evidence_id) REFERENCES evidence_records(id));',
    'CREATE TABLE IF NOT EXISTS press_custody (',
    ' seq INTEGER PRIMARY KEY AUTOINCREMENT, case_id TEXT NOT NULL, evidence_id TEXT NOT NULL,',
    ' event_type TEXT NOT NULL, actor_subject TEXT NOT NULL, payload_json TEXT NOT NULL,',
    ' created_at TEXT NOT NULL, previous_hash TEXT NOT NULL, event_hash TEXT NOT NULL);',
    'CREATE INDEX IF NOT EXISTS idx_press_custody_case ON press_custody(case_id,seq);'
  ].join('\n'))
  const timestamp = () => now().toISOString()
  function append(caseId, evidenceId, eventType, actorSubject, payload) {
    const last = db.prepare('SELECT event_hash FROM press_custody WHERE case_id=? ORDER BY seq DESC LIMIT 1').get(caseId)
    const previousHash = last?.event_hash || 'GENESIS'
    const createdAt = timestamp()
    const serialized = JSON.stringify(payload)
    const eventHash = digest(JSON.stringify([caseId, evidenceId, eventType, actorSubject, serialized, createdAt, previousHash]))
    db.prepare('INSERT INTO press_custody(case_id,evidence_id,event_type,actor_subject,payload_json,created_at,previous_hash,event_hash) VALUES(?,?,?,?,?,?,?,?)')
      .run(caseId, evidenceId, eventType, actorSubject, serialized, createdAt, previousHash, eventHash)
    return eventHash
  }
  function normalize(caseId) {
    const key = String(caseId || '').toUpperCase()
    if (!idPattern.test(key)) throw new Error('invalid_press_case_id')
    return key
  }
  const hasCase = (member, caseId) => Array.isArray(member?.caseIds) && (member.caseIds.includes(caseId) || member.caseIds.includes('*'))
  function lookup(id) {
    return db.prepare('SELECT e.id,e.asset,e.title,e.source_type,e.observed_at,m.case_id,m.original_sha256,m.locator_sha256,m.source_tier,m.editorial_state,m.access_level,m.reporter_subject FROM press_manifest m INNER JOIN evidence_records e ON e.id=m.evidence_id WHERE e.id=?').get(id) || null
  }
  function ingest(input, actorSubject) {
    const caseId = normalize(input?.caseId)
    if (typeof actorSubject !== 'string' || !actorSubject) throw new Error('verified_actor_required')
    const evidenceId = randomUUID()
    const originalSha = String(input.originalSha256 || '').toLowerCase()
    const locatorSha = String(input.sourceLocatorSha256 || '').toLowerCase()
    if (!hexPattern.test(locatorSha)) throw new Error('source_locator_digest_required')
    if (input.sourceKind === 'CREDENTIAL' && input.accessLevel !== 'RESTRICTED') throw new Error('credential_must_be_restricted')
    const meta = {
      id: evidenceId, caseId, title: input.title, custodianId: actorSubject,
      sourceLocator: 'sha256:' + locatorSha, acquiredAt: timestamp(),
      observedAt: input.observedAt, sha256: originalSha,
      sourceTier: input.sourceTier, editorialState: input.editorialState,
      accessLevel: input.accessLevel, sourceKind: input.sourceKind,
      corroborationNote: input.corroborationNote
    }
    const errors = validateEvidenceMetadata(meta)
    if (errors.length) throw new Error('invalid_press_metadata:' + errors.join(';'))
    if (input.sourceKind === 'CREDENTIAL') throw new Error('credential_intake_requires_private_media_vault')
    // No raw bytes, original URLs, source identities or credential images enter this DB.
    // Original hashes are DECLARED hashes, not verified original-asset attestations.
    db.exec('BEGIN IMMEDIATE')
    try {
      const stamp = timestamp()
      db.prepare('INSERT INTO evidence_records(id,asset,title,source_type,source_url,claim_type,observed_at,review_status,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?)')
        .run(evidenceId, 'PRESS:' + caseId, input.title, 'PRESS_METADATA', null, 'INDEPENDENT_JOURNALISM', input.observedAt, 'UNREVIEWED', stamp, stamp)
      db.prepare('INSERT INTO press_manifest(evidence_id,case_id,original_sha256,locator_sha256,source_tier,editorial_state,access_level,reporter_subject) VALUES(?,?,?,?,?,?,?,?)')
        .run(evidenceId, caseId, originalSha, locatorSha, input.sourceTier, input.editorialState, input.accessLevel, actorSubject)
      const hash = append(caseId, evidenceId, 'INTAKE_DECLARED', actorSubject, { originalSha256: originalSha, sourceTier: input.sourceTier, sourceVerified: false })
      db.prepare('INSERT INTO evidence_events(id,evidence_id,asset,event_type,actor,payload_json,created_at) VALUES(?,?,?,?,?,?,?)')
        .run(randomUUID(), evidenceId, 'PRESS:' + caseId, 'press.intake.declared', actorSubject, JSON.stringify({ custodyHead: hash }), stamp)
      db.exec('COMMIT')
      return { id: evidenceId, caseId, sourceVerified: false, editorialReviewRequired: true }
    } catch (error) { db.exec('ROLLBACK'); throw error }
  }
  function review(id, gate, decision, actorSubject) {
    if (!PRESS_REVIEW_GATES.includes(gate) || !['APPROVE','REJECT'].includes(decision)) throw new Error('invalid_review')
    const item = lookup(id)
    if (!item) return null
    if (item.reporter_subject === actorSubject) throw new Error('independent_review_required')
    if (db.prepare('SELECT 1 FROM press_reviews WHERE evidence_id=? AND reviewer_subject=?').get(id, actorSubject)) {
      throw new Error('independent_reviewer_per_gate_required')
    }
    db.exec('BEGIN IMMEDIATE')
    try {
      const at = timestamp()
      db.prepare('INSERT INTO press_reviews(evidence_id,gate,reviewer_subject,decision,created_at) VALUES(?,?,?,?,?)').run(id, gate, actorSubject, decision, at)
      const hash = append(item.case_id, id, 'EDITORIAL_' + gate, actorSubject, { decision })
      db.prepare('INSERT INTO evidence_events(id,evidence_id,asset,event_type,actor,payload_json,created_at) VALUES(?,?,?,?,?,?,?)')
        .run(randomUUID(), id, item.asset, 'press.review', actorSubject, JSON.stringify({ gate, decision, custodyHead: hash }), at)
      db.exec('COMMIT')
      return { id, gate, decision, publicationPerformed: false }
    } catch (error) { db.exec('ROLLBACK'); throw error }
  }
  function verifyCase(caseId) {
    const key = normalize(caseId)
    const events = db.prepare('SELECT * FROM press_custody WHERE case_id=? ORDER BY seq ASC').all(key)
    let previous = 'GENESIS'
    for (const event of events) {
      const expected = digest(JSON.stringify([event.case_id, event.evidence_id, event.event_type, event.actor_subject, event.payload_json, event.created_at, previous]))
      if (event.previous_hash !== previous || event.event_hash !== expected) return { valid: false, count: events.length, failedSequence: event.seq }
      previous = event.event_hash
    }
    return { valid: true, count: events.length, head: previous, externallyAnchored: false }
  }
  function releaseCandidate(id) {
    const item = lookup(id)
    if (!item) return null
    const integrity = verifyCase(item.case_id)
    if (!integrity.valid) throw new Error('custody_integrity_failed')
    if (item.access_level !== 'PUBLIC' || item.editorial_state !== 'CORROBORATED') throw new Error('not_eligible_for_publication')
    const reviews = db.prepare('SELECT gate,reviewer_subject,decision FROM press_reviews WHERE evidence_id=?').all(id)
    if (reviews.some(r => r.decision === 'REJECT') ||
        !PRESS_REVIEW_GATES.every(gate => reviews.some(r => r.gate === gate && r.decision === 'APPROVE'))) {
      throw new Error('three_independent_approvals_required')
    }
    // A protected, redacted candidate; publishing is not implemented.
    return { id, caseId: item.case_id, title: item.title,
      sourceTier: item.source_tier, editorialState: item.editorial_state,
      custodyHead: integrity.head, publicationPerformed: false,
      nextAction: 'INDEPENDENT_HUMAN_PUBLICATION_DECISION' }
  }
  function custody(caseId) {
    const integrity = verifyCase(caseId)
    return { integrity, events: db.prepare('SELECT seq,evidence_id,event_type,actor_subject,created_at,previous_hash,event_hash FROM press_custody WHERE case_id=? ORDER BY seq ASC').all(normalize(caseId)) }
  }
  return { ingest, review, lookup, releaseCandidate, custody, verifyCase, normalize, hasCase, close: () => vault.close() }
}
