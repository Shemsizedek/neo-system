import test from 'node:test';
import assert from 'node:assert/strict';
import {trustedSenderOrigin} from './origin-policy.mjs';
const sender={id:'extension',frameId:0,url:'https://community.example/page'};
test('pins RPC origin to browser-supplied top-frame sender',()=>{
 assert.equal(trustedSenderOrigin(sender,{origin:'https://community.example'},'extension'),'https://community.example');
 for(const changed of [{id:'attacker'},{frameId:1},{url:'http://community.example/page'},{url:'chrome://settings'},{url:undefined}])assert.throws(()=>trustedSenderOrigin({...sender,...changed},{origin:'https://community.example'},'extension'));
 assert.throws(()=>trustedSenderOrigin(sender,{origin:'https://trusted-wallet.example'},'extension'));
});
