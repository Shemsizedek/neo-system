import test from 'node:test';import assert from 'node:assert/strict';
import {createNeopassOperatorBridge} from './neopass-operator-bridge.mjs';
test('requires trusted session and registry adapters',()=>assert.throws(()=>createNeopassOperatorBridge({}),/neopass_authority_not_configured/));
test('rejects unverified session with forged claimed role',async()=>{
 const v=createNeopassOperatorBridge({verifySession:async()=>({authenticated:false,subject:'attacker',role:'executive-admin'}),authorizeOperator:async()=>true});
 await assert.rejects(v({headers:{'x-user-role':'executive-admin'}}),/invalid_neopass_session/);
});
test('rejects verified member without authorized role',async()=>{
 const v=createNeopassOperatorBridge({verifySession:async()=>({authenticated:true,subject:'member'}),authorizeOperator:async()=>false});
 await assert.rejects(v({}),/operator_permission_denied/);
});
test('accepts server-authorized operator',async()=>{
 const v=createNeopassOperatorBridge({verifySession:async()=>({authenticated:true,subject:'operator-1'}),authorizeOperator:async(subject,role)=>subject==='operator-1'&&role==='neo_sales_operator'});
 assert.deepEqual(await v({}),{verified:true,subject:'operator-1',roles:['neo_sales_operator']});
});
