import test from 'node:test'
import assert from 'node:assert/strict'
import {createCareersRecordsReader} from './records-reader.mjs'
const claims={sub:'worker1',iss:'https://id.example',aud:'neo-careers',exp:Math.floor(Date.now()/1000)+3600,roles:['contributor'],employerId:'firm1'}
test('unverified sessions never reach database',async()=>{let called=false;const r=createCareersRecordsReader({query:async()=>{called=true;return {rows:[]}}});assert.equal((await r.workerRecords({claims})).ok,false);assert.equal(called,false)})
test('worker query is parameterized and scoped by subject',async()=>{let seen;const r=createCareersRecordsReader({query:async(sql,args)=>{seen={sql,args};return {rows:[]}}});assert.equal((await r.workerRecords({claims,trustedVerification:true})).ok,true);assert.deepEqual(seen.args,['worker1']);assert.match(seen.sql,/subject_id=\$1/)})
test('employer access is tenant-scoped',async()=>{let args;const r=createCareersRecordsReader({query:async(_sql,a)=>{args=a;return {rows:[]}}});await r.employerRecords({claims:{...claims,roles:['employer']},trustedVerification:true});assert.deepEqual(args,['firm1'])})
test('read-only adapter has no transfer capability',()=>assert.equal(createCareersRecordsReader({query:async()=>({rows:[]})}).capabilities().payrollEnabled,false))
test('database injection required',()=>assert.throws(()=>createCareersRecordsReader(),/trusted database/))
