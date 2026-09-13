import test from 'node:test'
import assert from 'node:assert/strict'
import {openTribunalDb} from './db.mjs'
import {TribunalService} from './service.mjs'
import {claimPublicIntake,ensurePublicIntakeSchema,listPublicIntakes,promotePublicIntake,submitPublicIntake} from './publicIntake.mjs'

const setup=()=>{
  process.env.NEO_TRIBUNAL_MASTER_KEY='public-intake-test-master-key-1234567890'
  const db=openTribunalDb(':memory:')
  ensurePublicIntakeSchema(db)
  const service=new TribunalService(db)
  service.register({email:'judge@example.test',displayName:'Judge',password:'password123'})
  const login=service.login({email:'judge@example.test',password:'password123'})
  const principal=service.principal(login.token)
  const workspace=service.createWorkspace(principal,{name:'World Interfaith Court'})
  return {db,service,principal,workspace}
}

test('public intake is encrypted, receipted, moderated, and promoted only after review',()=>{
  const {db,service,principal,workspace}=setup()
  const receipt=submitPublicIntake(db,{
    caseType:'Civil',petitioner:'A. Petitioner',petitionerEmail:'a@example.test',respondent:'B. Respondent',statement:'Statement for institutional review.',consent:true
  },{sourceIp:'203.0.113.5',userAgent:'test'})
  assert.equal(receipt.status,'PENDING_REVIEW')
  assert.match(receipt.receiptCode,/^WIC-/)
  assert.equal(receipt.payloadHash.length,64)
  const stored=db.prepare('SELECT * FROM public_intakes WHERE id=?').get(receipt.intakeId)
  assert.equal(stored.payload_envelope.includes('A. Petitioner'),false)

  const pending=listPublicIntakes(db,service,principal,workspace.id,'PENDING_REVIEW')
  assert.equal(pending.length,1)
  assert.equal(pending[0].payload.petitioner,'A. Petitioner')

  assert.throws(()=>promotePublicIntake(db,service,principal,workspace.id,receipt.intakeId),/claimed for review/)
  const claimed=claimPublicIntake(db,service,principal,workspace.id,receipt.intakeId)
  assert.equal(claimed.status,'UNDER_REVIEW')
  const promoted=promotePublicIntake(db,service,principal,workspace.id,receipt.intakeId,{claimNo:'WIC-CASE-001'})
  assert.equal(promoted.filing.claimNo,'WIC-CASE-001')
  assert.equal(promoted.intake.status,'PROMOTED')
  assert.equal(service.listEFiles(principal,workspace.id,'WIC-CASE-001').length,1)
  assert.equal(service.verifyAudit(workspace.id).valid,true)
})

test('public intake validates consent, required fields, email, and honeypot',()=>{
  const {db}=setup()
  assert.throws(()=>submitPublicIntake(db,{caseType:'Civil',petitioner:'A',petitionerEmail:'bad',respondent:'B',statement:'x',consent:true}),/valid petitioner email/)
  assert.throws(()=>submitPublicIntake(db,{caseType:'Civil',petitioner:'A',petitionerEmail:'a@example.test',respondent:'B',statement:'x',consent:false}),/Consent/)
  assert.throws(()=>submitPublicIntake(db,{caseType:'Civil',petitioner:'A',petitionerEmail:'a@example.test',respondent:'B',statement:'x',consent:true,website:'spam.example'}),/rejected/)
  assert.equal(db.prepare('SELECT MAX(version) version FROM schema_meta').get().version,6)
})
