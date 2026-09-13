import test from 'node:test'
import assert from 'node:assert/strict'
import {addPolicyDays,calculateDeadline,isBusinessDay,ruleFingerprint} from './deadlinePolicy.mjs'
test('business-day deadlines skip weekends',()=>{assert.equal(calculateDeadline({triggerAt:'2026-09-11',days:1,businessDays:true}),'2026-09-14');assert.equal(addPolicyDays('2026-09-11',2,{businessDays:true}),'2026-09-15')})
test('holiday calendars are honored',()=>{assert.equal(calculateDeadline({triggerAt:'2026-09-11',days:1,businessDays:true,holidays:['2026-09-14']}),'2026-09-15');assert.equal(isBusinessDay('2026-09-14',['2026-09-14']),false)})
test('rule fingerprints are deterministic and authority-sensitive',()=>{const a={name:'Response',jurisdiction:'Internal Tribunal',procedure:'Notice response',days:14,businessDays:false,authority:{corpusId:'CANON-1',citation:'Art. 4'}};assert.equal(ruleFingerprint(a),ruleFingerprint({...a}));assert.notEqual(ruleFingerprint(a),ruleFingerprint({...a,authority:{corpusId:'CANON-2'}}))})
