import assert from 'node:assert/strict';
import test from 'node:test';
import { randomUUID } from 'node:crypto';
import { createApprovedDeviceExecutor } from './approved-device-executor.mjs';

// Explicit opt-in only. Never run against an unverified production database.
// Requires an isolated ephemeral database preloaded with migrations 001, 002, 005.
const url=process.env.NOOGLE_TEST_DATABASE_URL;
const enabled=process.env.NOOGLE_ALLOW_DB_INTEGRATION==='yes' && !!url;
test('postgres: concurrent approvals apply once, audit once, and deny replay', {skip:!enabled}, async()=>{
 const {Pool}=await import('pg');
 const pool=new Pool({connectionString:url,max:4,ssl:process.env.NOOGLE_TEST_DB_SSL==='yes'?{rejectUnauthorized:true}:undefined});
 const subject='nsec112-'+randomUUID(), deviceId=randomUUID(),approvalId=randomUUID();
 try{
  await pool.query("INSERT INTO noogle_connect_devices(id,subject_id,type,label,public_key_hash,created_at) VALUES($1,$2,'android','Before',$3,1)",[deviceId,subject,randomUUID().replaceAll('-','').padEnd(64,'0')]);
  await pool.query("INSERT INTO noogle_connect_approvals(id,subject_id,device_id,action,label,expires_at) VALUES($1,$2,$3,'devices.rename','After',99999999999999)",[approvalId,subject,deviceId]);
  const executor=createApprovedDeviceExecutor({pool,verifyApproval:async()=>({approvalId,subject,deviceId,action:'devices.rename',label:'After'})});
  const req={approval:'verified-test-token',subject,deviceId,action:'devices.rename',label:'After',now:Date.now()};
  const results=await Promise.allSettled([executor(req),executor(req)]);
  assert.equal(results.filter(r=>r.status==='fulfilled').length,1);
  assert.equal(results.filter(r=>r.status==='rejected').length,1);
  assert.equal((await pool.query('SELECT count(*)::int AS total FROM noogle_connect_device_audit WHERE approval_id=$1',[approvalId])).rows[0].total,1);
  assert.equal((await pool.query('SELECT label FROM noogle_connect_devices WHERE id=$1',[deviceId])).rows[0].label,'After');
  await assert.rejects(()=>executor(req),/approval_replayed_or_expired/);
 }finally{
  await pool.query('DELETE FROM noogle_connect_device_audit WHERE approval_id=$1',[approvalId]);
  await pool.query('DELETE FROM noogle_connect_approvals WHERE id=$1',[approvalId]);
  await pool.query('DELETE FROM noogle_connect_devices WHERE id=$1',[deviceId]);
  await pool.end();
 }
});
