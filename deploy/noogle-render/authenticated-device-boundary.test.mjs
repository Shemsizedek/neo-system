import assert from 'node:assert/strict';
import test from 'node:test';
import {createAuthenticatedDeviceBoundary} from './authenticated-device-boundary.mjs';

test('device lifecycle requires matching verified session and device identity',async()=>{
 const calls=[];
 const boundary=createAuthenticatedDeviceBoundary({
  verifySession:async token=>token==='valid'?{subject:'owner',assurance:'session-only'}:null,
  verifyDeviceAssertion:async({assertion})=>assertion==='proof'?{subject:'owner',assurance:'device-bound',credentialId:'cred-1'}:
   assertion==='other'?{subject:'other',assurance:'device-bound',credentialId:'cred-2'}:null,
  deviceLifecycle:{
   list:async ctx=>{calls.push(ctx);return [];},
   rename:async(ctx,id,label)=>{calls.push(ctx);return {id,label};},
   revoke:async(ctx,id)=>{calls.push(ctx);return {id,revoked:true};}
  }
 });
 await assert.rejects(()=>boundary.list({sessionToken:'forged',assertion:'proof'}),/session_required/);
 await assert.rejects(()=>boundary.list({sessionToken:'valid',assertion:'other'}),/device_proof_required/);
 await assert.rejects(()=>boundary.list({sessionToken:'valid',assertion:null}),/device_proof_required/);
 assert.deepEqual(await boundary.list({sessionToken:'valid',assertion:'proof'}),[]);
 assert.deepEqual(calls[0],{subject:'owner',assurance:'device-bound',credentialId:'cred-1'});
 assert.deepEqual(await boundary.rename({sessionToken:'valid',assertion:'proof',id:'id',label:'Phone'}),{id:'id',label:'Phone'});
 assert.deepEqual(await boundary.revoke({sessionToken:'valid',assertion:'proof',id:'id'}),{id:'id',revoked:true});
});
