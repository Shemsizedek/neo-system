import test from 'node:test';
import assert from 'node:assert/strict';
import {tellerSessionReadiness,verifyTellerSession,crownAnchorReadiness} from './teller-trust.mjs';
import {createNeoBankServer} from './server.mjs';
test('Teller assertions fail closed without a trusted issuer',async()=>{
 await assert.rejects(verifyTellerSession('anything'),/teller_issuer_not_configured/);
 await assert.rejects(verifyTellerSession('anything',{verifyIssuer:async()=>({verified:false})}),/teller_session_invalid/);
 assert.equal(tellerSessionReadiness().customerSessionTrusted,false);
});
test('Crown anchoring has no accidental publication capability',()=>{
 const status=crownAnchorReadiness();
 assert.equal(status.onChainAnchored,false);
 assert.equal(status.publishingAuthorized,false);
});
test('Crown anchoring readiness requires authenticated session',async()=>{
 const server=createNeoBankServer({store:{},sessionSecret:'test-secret'});
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 try{assert.equal((await fetch('http://127.0.0.1:'+server.address().port+'/api/v1/crown/anchoring-status')).status,401)}
 finally{await new Promise(resolve=>server.close(resolve))}
});
