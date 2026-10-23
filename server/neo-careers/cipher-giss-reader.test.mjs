import test from 'node:test'
import assert from 'node:assert/strict'
import {createCipherGissReader} from './cipher-giss-reader.mjs'
const claims={sub:'student1',exp:Math.floor(Date.now()/1000)+600,aud:'neo-careers-giss',roles:['student']}
const adapters={verifySession:async()=>claims,readStudent:async()=>({subject:'student1',mentorSubject:'mentor1',modules:[{title:'GISS Foundations 101',state:'in-progress'}]}),readCareer:async()=>({subject:'student1',track:'software',status:'training'}),readMentor:async()=>({subject:'mentor1',displayName:'Mentor',accreditation:'verified'})}
test('rejects missing trusted adapters',()=>assert.throws(()=>createCipherGissReader(),/trusted adapters/))
test('valid reader combines school and career data',async()=>{const x=await createCipherGissReader(adapters).learner({credential:'token'});assert.equal(x.ok,true);assert.equal(x.data.modules.length,1)})
test('session failure never fetches private student records',async()=>{let called=false;const x=await createCipherGissReader({...adapters,verifySession:async()=>{throw Error('invalid')},readStudent:async()=>{called=true}}).learner({credential:'invalid'});assert.equal(x.ok,false);assert.equal(called,false)})
test('wrong student record rejected',async()=>{const x=await createCipherGissReader({...adapters,readStudent:async()=>({subject:'other'})}).learner();assert.equal(x.ok,false)})
test('gateway does not enable writing',()=>assert.equal(createCipherGissReader(adapters).capabilities().enrollmentWrites,false))
