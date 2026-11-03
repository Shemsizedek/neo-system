// NEO-OMARCHY-006: durable, approval-gated device enrollment for a private lab.
// Requires independently authenticated caller, trusted NEOpass issuer and operator
// verifiers. This module has NO HTTP or automatic activation.
import { createHash, randomBytes } from 'node:crypto'

const MACHINE=/^neo:machine:[a-z0-9][a-z0-9-]{0,63}$/
const HEX64=/^[a-f0-9]{64}$/i
const ZERO='0'.repeat(64)
const digest=x=>createHash('sha256').update(x).digest('hex')
const ensure=(condition,message)=>{if(!condition)throw new Error(message)}

export function createStagingDeviceEnrollment({
  pool, verifyDeviceProof, verifyOperatorApproval,
  now=()=>Date.now(), random=n=>randomBytes(n),
}={}) {
  ensure(pool && typeof pool.connect==='function' &&
    typeof verifyDeviceProof==='function' &&
    typeof verifyOperatorApproval==='function','enrollment_dependencies_missing')
  const stamp=()=>{
    const current=now()
    ensure(Number.isSafeInteger(current) && current>0,'invalid_clock')
    return current
  }
  async function transaction(work) {
    const client=await pool.connect()
    let active=false
    try {
      await client.query('BEGIN')
      active=true
      await client.query('SELECT pg_advisory_xact_lock(4204, 4)')
      const value=await work(client)
      await client.query('COMMIT')
      active=false
      return value
    } catch(error) {
      if(active){try{await client.query('ROLLBACK')}catch{}}
      throw error
    } finally {client.release()}
  }
  async function audit(client,kind,subjectId,metadata) {
    const rows=await client.query(
      'SELECT event_hash FROM neo_omarchy.audit_events ORDER BY seq DESC LIMIT 1',
    )
    const previous=rows.rows?.[0]?.event_hash || ZERO
    const body={kind,subjectId,metadata,previous}
    const eventHash=digest('NEO-OMARCHY-004:'+JSON.stringify(body))
    await client.query(
      'INSERT INTO neo_omarchy.audit_events(kind,subject_id,metadata_json,previous_hash,event_hash) VALUES($1,$2,$3::jsonb,$4,$5)',
      [kind,subjectId,JSON.stringify(metadata),previous,eventHash],
    )
  }
  return {
    async createChallenge({machineId}) {
      ensure(MACHINE.test(machineId || ''),'invalid_machine_id')
      const nonce=random(32).toString('hex')
      ensure(HEX64.test(nonce),'random_challenge_invalid')
      const expiresAt=stamp()+120_000
      return transaction(async client=>{
        const existing=await client.query(
          'SELECT machine_id FROM neo_omarchy.machines WHERE machine_id=$1',[machineId],
        )
        ensure(existing.rows?.length===0,'device_already_registered')
        // Unique PK denies challenge replacement; no nonce rollback/reissue by default.
        await client.query(
          'INSERT INTO neo_omarchy.enrollment_challenges(machine_id,nonce,expires_at) VALUES($1,$2,$3)',
          [machineId,nonce.toLowerCase(),new Date(expiresAt).toISOString()],
        )
        await audit(client,'machine.challenge_006',machineId,{expiresAt,scope:'omarchy:device:enroll'})
        return {machineId,nonce:nonce.toLowerCase(),
          audience:'neo-omarchy-device-006',expiresAt}
      })
    },
    async enroll({machineId,nonce,proof,devicePublicKeyPem,possessionSignature,operatorEnvelope}) {
      ensure(MACHINE.test(machineId || '') && HEX64.test(nonce || ''),'challenge_invalid')
      // No user-controlled "verified:true" accepted; verification is performed
      // within this trusted service boundary using separately configured keys.
      const checked=await verifyDeviceProof({
        machineId,nonce,proof,devicePublicKeyPem,possessionSignature,
      })
      ensure(checked?.verified===true && checked.machineId===machineId &&
        checked.nonce===nonce && checked.issuer==='NEOpass' &&
        checked.audience==='neo-omarchy-device-006' &&
        HEX64.test(checked.proofId || '') &&
        HEX64.test(checked.keyFingerprint || '') &&
        HEX64.test(checked.deviceKeyFingerprint || '') &&
        typeof checked.devicePublicKeyPem==='string' &&
        Number.isSafeInteger(checked.expiresAt) &&
        checked.expiresAt>stamp(),'neopass_device_proof_unverified')
      const approval=await verifyOperatorApproval(
        operatorEnvelope,{action:'machine.approve',target:machineId},
      )
      ensure(approval?.verified===true && approval.action==='machine.approve' &&
        approval.target===machineId && approval.scope==='omarchy:machine:approve' &&
        HEX64.test(approval.nonce || '') &&
        /^neo:operator:[a-z0-9][a-z0-9._-]{0,63}$/.test(approval.subject || '') &&
        Number.isSafeInteger(approval.expiresAt) &&
        approval.expiresAt>stamp(),'operator_approval_unverified')
      return transaction(async client=>{
        const at=stamp()
        const challenge=await client.query(
          'SELECT nonce,expires_at,consumed_at FROM neo_omarchy.enrollment_challenges WHERE machine_id=$1 FOR UPDATE',
          [machineId],
        )
        const row=challenge.rows?.[0]
        ensure(row && row.nonce===nonce.toLowerCase() &&
          row.consumed_at===null &&
          +new Date(row.expires_at)>at && checked.expiresAt>at &&
          approval.expiresAt>at,'enrollment_challenge_expired_or_consumed')
        const approvalNonce=await client.query(
          'INSERT INTO neo_omarchy.operator_replay(subject_id,nonce) VALUES($1,$2) ON CONFLICT DO NOTHING RETURNING nonce',
          [approval.subject,approval.nonce.toLowerCase()],
        )
        ensure(approvalNonce.rows?.length===1,'operator_approval_replay')
        await client.query(
          "INSERT INTO neo_omarchy.machines(machine_id,state,proof_id,issuer_key_fingerprint,proof_expires_at,approved_by,signing_public_key) VALUES($1,'approved',$2,$3,$4,$5,$6)",
          [machineId,checked.proofId.toLowerCase(),
            checked.keyFingerprint.toLowerCase(),
            new Date(checked.expiresAt).toISOString(),
            approval.subject,checked.devicePublicKeyPem],
        )
        await client.query(
          'UPDATE neo_omarchy.enrollment_challenges SET consumed_at=$2 WHERE machine_id=$1 AND consumed_at IS NULL',
          [machineId,new Date(at).toISOString()],
        )
        await audit(client,'machine.enrolled_006',machineId,{
          operator:approval.subject,scope:'local-inference',
          issuerKeyFingerprint:checked.keyFingerprint,
          deviceKeyFingerprint:checked.deviceKeyFingerprint,
          proofDigest:digest(checked.proofId),
        })
        return {machineId,state:'approved',scope:'local-inference',
          liveIssuerVerified:false, // operating environment certification is separate
          productionReady:false}
      })
    },
  }
}
