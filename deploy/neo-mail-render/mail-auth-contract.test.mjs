import {test} from 'node:test';
import assert from 'node:assert/strict';
import {validateMailGrant} from './mail-auth-contract.mjs';
const now=10000;
const p={sub:'member-1',aud:'neo-mail',token_use:'mail-access',scope:'mail:read',mailbox:'chaplain@holytemples.org',jti:'test-unique-1',iat:9950,exp:10100};
const expected={subject:'member-1',mailbox:'chaplain@holytemples.org',now};
test('accepts only correctly scoped short lived mail grants',()=>{
 assert.equal(validateMailGrant(p,expected),true);
 for(const [key,value] of Object.entries({scope:'neo:oracle:execute',token_use:'browser',mailbox:'other@example.org',aud:'other-service',exp:9999,iat:20000,jti:'',sub:'other-member'})){
  assert.equal(validateMailGrant({...p,[key]:value},expected),false,key);
 }
 assert.equal(validateMailGrant({...p,exp:11000},expected),false);
});
