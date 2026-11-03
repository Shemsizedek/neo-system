// NEO-OMARCHY-008: canonical, rehashable v2 event ledger.
// Does not retroactively certify legacy audit_events rows.
import { createHash, createPublicKey, verify } from 'node:crypto'
const SHA=/^[a-f0-9]{64}$/
const SUB=/^[a-zA-Z0-9][a-zA-Z0-9:._-]{0,95}$/
const KIND=/^[a-z][a-z0-9._-]{2,95}$/
const META=new Set(['machineId','taskId','missionId','outcome','resultSha256','proofSha256','proofKeyFingerprint','deviceKeyFingerprint','operatorId','scope','reason','status','source','modelDigest'])
const ZERO='0'.repeat(64)
const sha=v=>createHash('sha256').update(v).digest('hex')
function normalize(v) {
  if (v===null || typeof v==='string' || typeof v==='boolean') return v
  if (typeof v==='number' && Number.isSafeInteger(v)) return v
  if (Array.isArray(v) && v.length<=24) return v.map(normalize)
  if (v && typeof v==='object' && !Array.isArray(v) &&
      (Object.getPrototypeOf(v)===Object.prototype || Object.getPrototypeOf(v)===null)) {
    const out=Object.create(null),names=Object.keys(v).sort()
    if (names.length>24) throw new Error('too_many_fields')
    for (const k of names) {
      if (['__proto__','constructor','prototype'].includes(k)) throw new Error('dangerous_key')
      out[k]=normalize(v[k])
    }
    return out
  }
  throw new Error('noncanonical_data')
}
const json=x=>JSON.stringify(normalize(x))
function cleanMetadata(m) {
  if (!m || typeof m!=='object' || Array.isArray(m)) throw new Error('metadata_object_required')
  for (const [key,value] of Object.entries(m)) {
    if (!META.has(key) || !['string','number','boolean'].includes(typeof value) ||
        (typeof value==='number' && !Number.isSafeInteger(value)) ||
        (typeof value==='string' && (value.length>192 ||
          /-----BEGIN|password=|token=|secret=/i.test(value)))) {
      throw new Error('metadata_field_rejected')
    }
  }
  if (Buffer.byteLength(json(m))>2048) throw new Error('metadata_too_large')
  return normalize(m)
}
export function canonicalAuditRecord({sequence,eventType,subjectId,metadata,occurredAtMs,previousHash}={}) {
  if (!Number.isSafeInteger(sequence)||sequence<1||!KIND.test(eventType||'')||
      !SUB.test(subjectId||'')||!Number.isSafeInteger(occurredAtMs)||occurredAtMs<=0||
      !SHA.test(previousHash||'')) throw new Error('canonical_event_invalid')
  return json({schema:'NEO-OMARCHY-AUDIT-V2',sequence,eventType,subjectId,
    metadata:cleanMetadata(metadata),occurredAtMs,previousHash})
}
const hashEvent=record=>sha('NEO-OMARCHY-AUDIT-V2\n'+record)
export function verifyAuditV2Rows(rows) {
  if (!Array.isArray(rows)||rows.length>5000) throw new Error('audit_snapshot_unbounded')
  let prev=ZERO,snapshot=sha('NEO-OMARCHY-SNAPSHOT-V2\n')
  for(let i=0;i<rows.length;i++){
    const r=rows[i]
    if(Number(r.sequence)!==i+1||r.previous_hash!==prev||
       !SHA.test(r.event_hash||'')||typeof r.canonical_record!=='string')
       throw new Error('audit_linkage_invalid')
    const record=canonicalAuditRecord({sequence:i+1,eventType:r.event_type,
      subjectId:r.subject_id,metadata:r.metadata_json,
      occurredAtMs:Number(r.occurred_at_ms),previousHash:prev})
    if(record!==r.canonical_record||hashEvent(record)!==r.event_hash)
      throw new Error('audit_hash_verification_failed')
    prev=r.event_hash
    snapshot=sha(snapshot+'\n'+prev)
  }
  return {schema:'NEO-OMARCHY-AUDIT-V2',verified:true,eventCount:rows.length,
    headHash:prev,snapshotSha256:snapshot,
    originalAuditV1Migrated:false,independentlyWitnessed:false,blockchainAnchorVerified:false}
}
const READ='SELECT sequence,event_type,subject_id,metadata_json,occurred_at_ms,previous_hash,event_hash,canonical_record FROM neo_omarchy.audit_v2 ORDER BY sequence ASC'
export function createCanonicalAuditLedger({pool,now=()=>Date.now()}={}) {
  if(!pool||typeof pool.connect!=='function'||typeof pool.query!=='function')
    throw new Error('postgres_pool_required')
  return {
    async append({eventType,subjectId,metadata}) {
      cleanMetadata(metadata)
      if(!KIND.test(eventType||'')||!SUB.test(subjectId||'')) throw new Error('canonical_event_invalid')
      const client=await pool.connect();let active=false
      try {
        await client.query('BEGIN');active=true
        await client.query('SELECT pg_advisory_xact_lock(4204,8)')
        const last=await client.query('SELECT sequence,event_hash FROM neo_omarchy.audit_v2 ORDER BY sequence DESC LIMIT 1')
        const head=last.rows?.[0],sequence=head?Number(head.sequence)+1:1,previousHash=head?.event_hash||ZERO
        const occurredAtMs=now()
        const record=canonicalAuditRecord({sequence,eventType,subjectId,metadata,occurredAtMs,previousHash})
        const eventHash=hashEvent(record)
        await client.query(
          'INSERT INTO neo_omarchy.audit_v2(sequence,event_type,subject_id,metadata_json,occurred_at_ms,previous_hash,event_hash,canonical_record) VALUES($1,$2,$3,$4::jsonb,$5,$6,$7,$8)',
          [sequence,eventType,subjectId,json(metadata),occurredAtMs,previousHash,eventHash,record])
        await client.query('COMMIT');active=false
        return {sequence,eventHash,previousHash,productionReady:false}
      }catch(e){
        if(active){try{await client.query('ROLLBACK')}catch{}}
        throw e
      }finally{client.release()}
    },
    async verify() {
      const result=await pool.query(READ)
      return verifyAuditV2Rows(result.rows)
    },
    async exportSnapshot() {
      const result=await pool.query(READ),proof=verifyAuditV2Rows(result.rows)
      if(!proof.eventCount) throw new Error('no_audit_events')
      return proof
    }
  }
}
export function createWitnessRequest({verifiedSnapshot,contextId}={}) {
  if(verifiedSnapshot?.verified!==true||!verifiedSnapshot.eventCount||
      !SHA.test(verifiedSnapshot.headHash||'')||
      !SHA.test(verifiedSnapshot.snapshotSha256||'')||
      !/^neo:mission:[a-z0-9][a-z0-9._-]{0,63}$/.test(contextId||''))
    throw new Error('verified_snapshot_required')
  return {schema:'NEO-OMARCHY-WITNESS-REQUEST-008',contextId,
    eventCount:verifiedSnapshot.eventCount,headHash:verifiedSnapshot.headHash,
    snapshotSha256:verifiedSnapshot.snapshotSha256,externalSignatureVerified:false,
    independentlyWitnessed:false,blockchainAnchorVerified:false}
}
// External signer must sign the following canonical payload bytes under a
// separately approved witness key. Key ownership/independence is reviewed outside code.
export const witnessBytes=payload=>Buffer.from('NEO-OMARCHY-WITNESS-008\n'+json(payload))
export function verifyExternalWitness({request,attestation,publicKeyPem,expectedWitnessId}={}) {
  try{
    const p=attestation?.payload
    if(request?.schema!=='NEO-OMARCHY-WITNESS-REQUEST-008'||
       !/^neo:witness:[a-z0-9][a-z0-9._-]{0,63}$/.test(expectedWitnessId||'')||
       !p||p.schema!=='NEO-OMARCHY-WITNESS-ATTESTATION-008'||
       p.witnessId!==expectedWitnessId||p.contextId!==request.contextId||
       p.headHash!==request.headHash||p.snapshotSha256!==request.snapshotSha256||
       p.eventCount!==request.eventCount||!Number.isSafeInteger(p.signedAt)||
       typeof attestation.signature!=='string'||
       !/^[A-Za-z0-9_-]+$/.test(attestation.signature))return false
    const key=createPublicKey(publicKeyPem)
    if(key.asymmetricKeyType!=='ed25519')return false
    const sig=Buffer.from(attestation.signature,'base64url')
    return sig.length===64 && sig.toString('base64url')===attestation.signature &&
      verify(null,witnessBytes(p),key,sig)
  }catch{return false}
}
