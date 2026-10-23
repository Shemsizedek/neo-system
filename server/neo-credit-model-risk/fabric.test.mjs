import test from 'node:test'
import assert from 'node:assert/strict'
import {registerModel,createModelVersion,validateModelVersion,backtestModel,approveModelVersion,activateModel,validateReasonCode,createOverride,monitorDrift,retireModel,modelRiskSnapshot} from './fabric.mjs'

test('unvalidated models cannot activate',()=>{const m=registerModel({model_id:'m',name:'M',owner:'o'}),v=createModelVersion({model_id:'m',version:'1',specification:{}});assert.throws(()=>activateModel(m,v),/approved_model_required/)})
test('validation and approval gate activation',()=>{const m=registerModel({model_id:'m',name:'M',owner:'o'}),v=createModelVersion({model_id:'m',version:'1',specification:{}}),x=validateModelVersion(v,{validation_id:'v',validator_id:'x',tests:[{passed:true}],approved:true}),a=approveModelVersion(x.version,{approval_id:'a',approver_id:'y',approved:true}),active=activateModel(m,a.version);assert.equal(active.status,'ACTIVE')})
test('backtest computes metrics',()=>{const b=backtestModel({model_id:'m',version:'1',predictions:[10,20],outcomes:[12,18]});assert.equal(b.available,true);assert.equal(b.mae,2)})
test('reason codes must be registered',()=>{const v=createModelVersion({model_id:'m',version:'1',specification:{},reason_codes:[{code:'UTIL_HIGH',description:'High utilization'}]});assert.equal(validateReasonCode(v,{code:'UTIL_HIGH'}).valid,true);assert.equal(validateReasonCode(v,{code:'X'}).valid,false)})
test('override requires evidence',()=>{assert.throws(()=>createOverride({override_id:'o',model_id:'m',version:'1',actor_id:'a',reason:'x'}),/override fields and evidence required/)})
test('drift monitoring detects large shifts',()=>{assert.equal(monitorDrift({model_id:'m',version:'1',baseline:[10,10],current:[20,20],threshold:.2}).drift_detected,true)})
test('retirement blocks status through retired state',()=>{const m=registerModel({model_id:'m',name:'M',owner:'o'}),v=createModelVersion({model_id:'m',version:'1',specification:{}}),r=retireModel(m,v,{reason:'obsolete',actor_id:'a'});assert.equal(r.model.status,'RETIRED');assert.equal(r.version.status,'RETIRED')})
test('snapshot prohibits unapproved use',()=>{assert.equal(modelRiskSnapshot({}).unapproved_model_use,false)})
