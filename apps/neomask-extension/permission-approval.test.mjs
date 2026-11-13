import test from 'node:test';
import assert from 'node:assert/strict';
import {handleRpc} from './rpc.js';
test('page cannot grant itself permissions without trusted approval UI',async()=>{
 delete globalThis.NeoMaskPermissionBridge;
 await assert.rejects(()=>handleRpc({origin:'https://no-ui.example',method:'neo_requestPermissions',params:[{permissions:['accounts','sign'],accounts:['page-chosen-address']}]}),/approval UI/);
});
test('accounts come from trusted approval, and permission escalation is rejected',async()=>{
 try{
  globalThis.NeoMaskPermissionBridge={request:async()=>({approved:true,permissions:['accounts'],accounts:['user-selected-address']})};
  const grant=await handleRpc({origin:'https://approved.example',method:'neo_requestPermissions',params:[{permissions:['accounts'],accounts:['attacker-selected']}]});
  assert.deepEqual(grant.accounts,['user-selected-address']);
  globalThis.NeoMaskPermissionBridge={request:async()=>({approved:true,permissions:['sign'],accounts:[]})};
  await assert.rejects(()=>handleRpc({origin:'https://escalation.example',method:'neo_requestPermissions',params:[{permissions:['accounts']}]}),/approval required/);
 }finally{delete globalThis.NeoMaskPermissionBridge;}
});
