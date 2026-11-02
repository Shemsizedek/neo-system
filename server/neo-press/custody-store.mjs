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
    'CREATE INDEX IF NOT EXISTS idx_press_custody_case ON press_custody(case_id,seq);',
    'CREATE TABLE IF NOT EXISTS press_media (',
    ' evidence_id TEXT PRIMARY KEY, original_sha256 TEXT NOT NULL, verified_at TEXT NOT NULL,',
    ' verified_by TEXT NOT NULL, key_id TEXT NOT NULL, plaintext_bytes INTEGER NOT NULL,',
    ' FOREIGN KEY(evidence_id) REFERENCES evidence_records(id));',
    'CREATE TABLE IF NOT EXISTS press_corrections (',
    ' id TEXT PRIMARY KEY, evidence_id TEXT NOT NULL, case_id TEXT NOT NULL,',
    ' category TEXT NOT NULL, summary TEXT NOT NULL, actor_subject TEXT NOT NULL,',
    ' created_at TEXT NOT NULL, status TEXT NOT NULL DEFAULT \'OPEN\',',
    ' FOREIGN KEY(evidence_id) REFERENCES evidence_records(id));',
    'CREATE INDEX IF NOT EXISTS idx_press_corrections_evidence ON press_corrections(evidence_id,created_at);',
    'CREATE TABLE IF NOT EXISTS press_correction_decisions (',
    ' correction_id TEXT NOT NULL, gate TEXT NOT NULL, reviewer_subject TEXT NOT NULL,',
    ' decision TEXT NOT NULL, note_sha256 TEXT NOT NULL, created_at TEXT NOT NULL,',
    ' PRIMARY KEY(correction_id,gate),',
    ' FOREIGN KEY(correction_id) REFERENCES press_corrections(id));',
    'CREATE TABLE IF NOT EXISTS press_post_correction_reviews (',
    ' evidence_id TEXT NOT NULL, revision_hash TEXT NOT NULL, gate TEXT NOT NULL,',
    ' reviewer_subject TEXT NOT NULL, decision TEXT NOT NULL, created_at TEXT NOT NULL,',
    ' PRIMARY KEY(evidence_id,revision_hash,gate),',
    ' FOREIGN KEY(evidence_id) REFERENCES evidence_records(id));'
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
  function ingest(input, actorSubject, { sealedIntake = false } = {}) {
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
    if (input.sourceKind === 'CREDENTIAL' && !sealedIntake) throw new Error('credential_intake_requires_private_media_vault')
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

  function attachVerifiedMedia(id, sealedReceipt, verification, actorSubject) {
    const item = lookup(id)
    if (!item) throw new Error('press_evidence_not_found')
    if (typeof actorSubject !== 'string' || !actorSubject) throw new Error('verified_actor_required')
    if (!sealedReceipt || !verification ||
      sealedReceipt.evidenceId !== id || verification.evidenceId !== id ||
      sealedReceipt.caseId !== item.case_id || verification.caseId !== item.case_id ||
      sealedReceipt.originalSha256 !== item.original_sha256 ||
      verification.originalSha256 !== item.original_sha256 ||
      verification.integrityVerified !== true ||
      sealedReceipt.keyId !== verification.keyId ||
      sealedReceipt.algorithm !== 'AES-256-GCM' ||
      !Number.isSafeInteger(verification.plaintextBytes) || verification.plaintextBytes < 1 ||
      verification.plaintextBytes !== sealedReceipt.plaintextBytes) {
      throw new Error('verified_media_receipt_mismatch')
    }
    if (db.prepare('SELECT evidence_id FROM press_media WHERE evidence_id=?').get(id)) throw new Error('original_media_already_linked')
    db.exec('BEGIN IMMEDIATE')
    try {
      const at = timestamp()
      db.prepare('INSERT INTO press_media(evidence_id,original_sha256,verified_at,verified_by,key_id,plaintext_bytes) VALUES(?,?,?,?,?,?)')
        .run(id, item.original_sha256, at, actorSubject, sealedReceipt.keyId, verification.plaintextBytes)
      const head = append(item.case_id, id, 'ORIGINAL_MEDIA_VERIFIED', actorSubject,
        { originalSha256: item.original_sha256, algorithm: sealedReceipt.algorithm, keyId: sealedReceipt.keyId })
      db.prepare('INSERT INTO evidence_events(id,evidence_id,asset,event_type,actor,payload_json,created_at) VALUES(?,?,?,?,?,?,?)')
        .run(randomUUID(), id, item.asset, 'press.media.verified', actorSubject, JSON.stringify({custodyHead:head}), at)
      db.exec('COMMIT')
      return { id, originalVerified: true, mediaEncrypted: true, externallyAttested: false }
    } catch(error){ db.exec('ROLLBACK'); throw error }
  }
  function getMediaStatus(id) {
    const row = db.prepare('SELECT original_sha256,verified_at,key_id,plaintext_bytes FROM press_media WHERE evidence_id=?').get(id)
    return row ? { originalVerified:true, originalSha256:row.original_sha256,
      verifiedAt:row.verified_at, keyId:row.key_id, plaintextBytes:row.plaintext_bytes } :
      { originalVerified:false }
  }
  function publicationPreflight(id, mediaStore) {
    const candidate = releaseCandidate(id)
    if (!candidate) return null
    const item = lookup(id)
    const status = getMediaStatus(id)
    if (!status.originalVerified || !mediaStore || typeof mediaStore.verify !== 'function') throw new Error('original_media_verification_required')
    const verified = mediaStore.verify({ caseId:item.case_id, evidenceId:id, originalSha256:item.original_sha256 })
    if (!verified.integrityVerified || verified.keyId !== status.keyId || verified.plaintextBytes !== status.plaintextBytes) {
      throw new Error('original_media_integrity_failed')
    }
    return { ...candidate, originalMediaVerified:true, mediaEncrypted:true,
      independentlyAnchored:false, publicationPerformed:false, readyForExternalPublication:false,
      nextAction:'INDEPENDENT_CUSTODY_AND_HUMAN_PUBLICATION_APPROVAL' }
  }


  function listCaseEvidence(caseId, { limit = 25, offset = 0 } = {}) {
    const key = normalize(caseId)
    if (!Number.isSafeInteger(limit) || limit < 1 || limit > 50 ||
        !Number.isSafeInteger(offset) || offset < 0 || offset > 500) throw new Error('invalid_page')
    const records = db.prepare(
      'SELECT e.id,e.title,e.observed_at,m.source_tier,m.editorial_state,m.access_level,' +
      'CASE WHEN pm.evidence_id IS NULL THEN 0 ELSE 1 END AS media_verified,' +
      '(SELECT COUNT(*) FROM press_corrections pc WHERE pc.evidence_id=e.id AND pc.status=\'OPEN\') AS correction_count ' +
      'FROM evidence_records e JOIN press_manifest m ON m.evidence_id=e.id ' +
      'LEFT JOIN press_media pm ON pm.evidence_id=e.id WHERE m.case_id=? ' +
      'ORDER BY e.created_at DESC,e.id DESC LIMIT ? OFFSET ?'
    ).all(key,limit,offset).map(r=>({
      id:r.id, title:r.title, observedAt:r.observed_at,
      sourceTier:r.source_tier, editorialState:r.editorial_state,
      restricted:r.access_level !== 'PUBLIC', originalMediaVerified:r.media_verified===1,
      correctionHold:r.correction_count>0, publicationPerformed:false
    }))
    const total=db.prepare('SELECT COUNT(*) AS n FROM press_manifest WHERE case_id=?').get(key).n
    return { caseId:key,records,total,limit,offset,nextOffset:offset+records.length<total?offset+records.length:null,
      publicAccess:false }
  }
  function submitCorrection(id,{category,summary},actorSubject){
    const item=lookup(id)
    if(!item)throw new Error('press_evidence_not_found')
    if(!['FACTUAL_ERROR','SOURCE_DISPUTE','CONSENT_WITHDRAWN','REDACTION_REQUEST'].includes(category) ||
       typeof summary!=='string' || summary.trim().length<8 || summary.length>500 ||
       /[\x00-\x08\x0b\x0c\x0e-\x1f]/.test(summary))throw new Error('invalid_correction')
    if(typeof actorSubject!=='string'||!actorSubject)throw new Error('verified_actor_required')
    db.exec('BEGIN IMMEDIATE')
    try{
      const idCorrection=randomUUID(),createdAt=timestamp()
      db.prepare('INSERT INTO press_corrections(id,evidence_id,case_id,category,summary,actor_subject,created_at) VALUES(?,?,?,?,?,?,?)')
        .run(idCorrection,id,item.case_id,category,summary.trim(),actorSubject,createdAt)
      const head=append(item.case_id,id,'EDITORIAL_CORRECTION_OPENED',actorSubject,
        { correctionId:idCorrection,category,summarySha256:digest(summary.trim()) })
      db.prepare('INSERT INTO evidence_events(id,evidence_id,asset,event_type,actor,payload_json,created_at) VALUES(?,?,?,?,?,?,?)')
        .run(randomUUID(),id,item.asset,'press.correction.opened',actorSubject,
          JSON.stringify({correctionId:idCorrection,category,custodyHead:head}),createdAt)
      db.exec('COMMIT')
      return {id:idCorrection,evidenceId:id,caseId:item.case_id,category,status:'OPEN',
        publicationBlocked:true,publicationPerformed:false}
    }catch(error){db.exec('ROLLBACK');throw error}
  }
  function listCorrections(id,{limit=25}={}){
    if(!lookup(id))return null
    if(!Number.isSafeInteger(limit)||limit<1||limit>50)throw new Error('invalid_page')
    return db.prepare(
      'SELECT id,category,summary,actor_subject,created_at,status FROM press_corrections ' +
      'WHERE evidence_id=? ORDER BY created_at DESC,id DESC LIMIT ?'
    ).all(id,limit).map(row=>({
      id:row.id,category:row.category,summary:row.summary,recordedAt:row.created_at,
      actorSubject:row.actor_subject,status:row.status
    }))
  }


  const ensureReviewNote = note => {
    if(typeof note!=='string'||note.trim().length<8||note.length>500||
      /[\x00-\x08\x0b\x0c\x0e-\x1f]/.test(note))throw new Error('invalid_review_rationale')
    return digest(note.trim())
  }
  function correctionLookup(id) {
    return db.prepare(
      'SELECT id,evidence_id,case_id,actor_subject,status,category FROM press_corrections WHERE id=?'
    ).get(id)||null
  }
  function correctionSnapshot(evidenceId) {
    const rows=db.prepare('SELECT id,status,category FROM press_corrections WHERE evidence_id=? ORDER BY id ASC').all(evidenceId)
    return { rows, revisionHash:digest(JSON.stringify(rows)) }
  }
  function decideCorrection(correctionId,{gate,decision,rationale},actorSubject){
    const item=correctionLookup(correctionId)
    if(!item)throw new Error('correction_not_found')
    if(!['EDITOR','PRIVACY'].includes(gate)||!['APPROVE','REJECT'].includes(decision))
      throw new Error('invalid_correction_decision')
    const reasonHash=ensureReviewNote(rationale)
    const evidence=lookup(item.evidence_id)
    if(item.status!=='OPEN')throw new Error('correction_not_open')
    if(!actorSubject||actorSubject===item.actor_subject||actorSubject===evidence.reporter_subject)
      throw new Error('independent_correction_review_required')
    db.exec('BEGIN IMMEDIATE')
    try{
      const prior=db.prepare('SELECT reviewer_subject FROM press_correction_decisions WHERE correction_id=?').all(correctionId)
      if(prior.some(row=>row.reviewer_subject===actorSubject))throw new Error('distinct_correction_reviewers_required')
      const at=timestamp()
      db.prepare('INSERT INTO press_correction_decisions(correction_id,gate,reviewer_subject,decision,note_sha256,created_at) VALUES(?,?,?,?,?,?)')
        .run(correctionId,gate,actorSubject,decision,reasonHash,at)
      append(item.case_id,item.evidence_id,'CORRECTION_'+gate+'_'+decision,actorSubject,
        {correctionId,decision,rationaleSha256:reasonHash})
      const decisions=db.prepare('SELECT gate,decision FROM press_correction_decisions WHERE correction_id=?').all(correctionId)
      if(decisions.length===2 && decisions.every(d=>d.decision==='APPROVE')){
        db.prepare("UPDATE press_corrections SET status='RESOLVED' WHERE id=? AND status='OPEN'").run(correctionId)
        append(item.case_id,item.evidence_id,'CORRECTION_RESOLVED',actorSubject,{correctionId})
      }
      db.exec('COMMIT')
      return {correctionId,status:correctionLookup(correctionId).status,
        needsPostCorrectionReview:true,publicationPerformed:false}
    }catch(error){db.exec('ROLLBACK');throw error}
  }
  function postCorrectionReview(evidenceId,{gate,decision,rationale},actorSubject){
    const item=lookup(evidenceId)
    if(!item)throw new Error('press_evidence_not_found')
    if(!PRESS_REVIEW_GATES.includes(gate)||!['APPROVE','REJECT'].includes(decision))
      throw new Error('invalid_post_correction_review')
    const rationaleSha256=ensureReviewNote(rationale)
    if(!actorSubject||actorSubject===item.reporter_subject)throw new Error('independent_review_required')
    const snap=correctionSnapshot(evidenceId)
    if(!snap.rows.length || snap.rows.some(r=>r.status!=='RESOLVED'))throw new Error('unresolved_correction_publication_hold')
    db.exec('BEGIN IMMEDIATE')
    try{
      const prior=db.prepare('SELECT reviewer_subject FROM press_post_correction_reviews WHERE evidence_id=? AND revision_hash=?')
        .all(evidenceId,snap.revisionHash)
      if(prior.some(x=>x.reviewer_subject===actorSubject))throw new Error('distinct_post_correction_reviewers_required')
      const at=timestamp()
      db.prepare('INSERT INTO press_post_correction_reviews(evidence_id,revision_hash,gate,reviewer_subject,decision,created_at) VALUES(?,?,?,?,?,?)')
        .run(evidenceId,snap.revisionHash,gate,actorSubject,decision,at)
      append(item.case_id,evidenceId,'POST_CORRECTION_'+gate,actorSubject,
        {decision,revisionHash:snap.revisionHash,rationaleSha256})
      db.exec('COMMIT')
      return {evidenceId,gate,revisionHash:snap.revisionHash,publicationPerformed:false}
    }catch(error){db.exec('ROLLBACK');throw error}
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
    const correctionState=correctionSnapshot(id)
    if(correctionState.rows.some(x=>x.status!=='RESOLVED'))throw new Error('unresolved_correction_publication_hold')
    if(correctionState.rows.length){
      const later=db.prepare('SELECT gate,decision FROM press_post_correction_reviews WHERE evidence_id=? AND revision_hash=?')
        .all(id,correctionState.revisionHash)
      if(later.some(x=>x.decision==='REJECT') || !PRESS_REVIEW_GATES.every(g=>later.some(x=>x.gate===g && x.decision==='APPROVE')))
        throw new Error('fresh_editorial_review_required_after_correction')
    }
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
  return { ingest, review, lookup, listCaseEvidence, submitCorrection, listCorrections, correctionLookup, decideCorrection, postCorrectionReview, attachVerifiedMedia, getMediaStatus, publicationPreflight, releaseCandidate, custody, verifyCase, normalize, hasCase, close: () => vault.close() }
}
