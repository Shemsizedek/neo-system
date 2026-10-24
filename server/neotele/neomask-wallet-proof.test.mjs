import test from 'node:test';
import assert from 'node:assert/strict';
import {createNeoTeleWalletProof} from './neomask-wallet-proof.mjs';
const params={sessionToken:'token',address:'bc1qexample',signature:'signed-message',nonce:'one-use'};
const deps={resolveSession:async()=>({verified:true,subject:'chaplain-1'}),verifyBip322:async()=>({valid:true}),consumeNonce:async()=>true};
test('trusted verifier and consumed nonce establish offchain proof',async()=>{
 const result=await createNeoTeleWalletProof(deps)(params);
 assert.equal(result.ownershipVerified,true);assert.equal(result.tokenPublished,false);
});
test('invalid signatures and repeated nonce rejected',async()=>{
 await assert.rejects(()=>createNeoTeleWalletProof({...deps,verifyBip322:async()=>({valid:false})})(params),/wallet_signature_invalid/);
 await assert.rejects(()=>createNeoTeleWalletProof({...deps,consumeNonce:async()=>false})(params),/wallet_proof_replayed/);
});
test('unauthenticated session rejected',async()=>{
 await assert.rejects(()=>createNeoTeleWalletProof({...deps,resolveSession:async()=>({verified:false})})(params),/neopass_authentication_required/);
});
