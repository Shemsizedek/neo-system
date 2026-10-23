import test from 'node:test'
import assert from 'node:assert/strict'
import {createCase,addCaseIssue,createDeadline,evaluateDeadline,addInvestigationStep,createNotice,validateAdverseActionReasons,recordFurnisherResponse,createEvidencePackage,resolveCase,createCorrectionHandoff,createAuditExport,complianceSnapshot} from './fabric.mjs'

test('case workflow captures issues and investigation',()=>{let c=createCase({case_id:'c',subject_id:'s',case_type:'DISPUTE'});c=addCaseIssue(c,{issue_id:'i',issue_type:'BALANCE'});c=addInvestigationStep(c,{step_id:'s1',action:'review',evidence_refs:['e']});assert.equal(c.status,'UNDER_INVESTIGATION');assert.equal(c.issues.length,1)})
test('deadline becomes overdue after due time',()=>{const d=createDeadline({deadline_id:'d',case_id:'c',due_at:'2026-01-01T00:00:00Z',policy_ref:'p'});assert.equal(evaluateDeadline(d,{asOf:new Date('2026-02-01T00:00:00Z')}).overdue,true)})
test('adverse action rejects model inference only',()=>{assert.equal(validateAdverseActionReasons([{code:'X',description:'x',source:'MODEL_INFERENCE_ONLY'}]).valid,false)})
test('notice requires jurisdiction template',()=>{assert.throws(()=>createNotice({notice_id:'n',case_id:'c',notice_type:'x'}),/notice fields required/)})
test('evidence package is digest stamped',()=>{const c=createCase({case_id:'c',subject_id:'s',case_type:'DISPUTE'}),p=createEvidencePackage({package_id:'p',caseFile:c});assert.equal(typeof p.digest,'string')})
test('correction handoff requires resolved correction case',()=>{const c=createCase({case_id:'c',subject_id:'s',case_type:'DISPUTE'});assert.throws(()=>createCorrectionHandoff({caseFile:c,tradeline_id:'t',patch:{}}),/resolved_correction_case_required/)})
test('audit export has digest',()=>{const c=createCase({case_id:'c',subject_id:'s',case_type:'DISPUTE'});assert.equal(typeof createAuditExport({caseFile:c}).digest,'string')})
test('snapshot keeps legal determination false',()=>{assert.equal(complianceSnapshot({}).external_legal_determination,false)})
