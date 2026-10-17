import test from 'node:test';
import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import { verifyEnergySession, SessionError } from './verify-session.mjs';

const secret='dev-only-do-not-deploy-this-0123456789abcdef';
const now=1791500000;
const cfg={secret,issuer:'neo-pass',audience:'neo-energy',nowSeconds:now};
function token(patch={},headerPatch={}) {
  const enc=x=>Buffer.from(JSON.stringify(x)).toString('base64url');
  const a=enc({alg:'HS256',typ:'JWT',...headerPatch});
  const b=enc({sub:'customer-a',iss:'neo-pass',aud:'neo-energy',
               token_use:'energy-customer',iat:now-30,exp:now+600,...patch});
  const sig=createHmac('sha256',secret).update(a+'.'+b).digest('base64url');
  return a+'.'+b+'.'+sig;
}
test('accepts correctly scoped, signed session',()=>{
  const claims=verifyEnergySession(token(),cfg);
  assert.equal(claims.subject,'customer-a');
  assert.equal(claims.audience,'neo-energy');
  assert.equal(claims.site_id,undefined);
});
for(const [name,patch] of [
 ['expired',{exp:now-1}],['missing expiry',{exp:null}],
 ['wrong audience',{aud:'neo-bank'}],['wrong purpose',{token_use:'crown-office'}],
 ['wrong issuer',{iss:'untrusted'}],['future not-before',{nbf:now+1000}],
 ['future issued-at',{iat:now+1000}]
]) test('denies '+name,()=>assert.throws(()=>verifyEnergySession(token(patch),cfg),SessionError));
test('rejects unsigned/altered token',()=>{
  const parts=token().split('.');
  parts[1]=Buffer.from(JSON.stringify({sub:'admin'})).toString('base64url');
  assert.throws(()=>verifyEnergySession(parts.join('.'),cfg),SessionError);
});
test('rejects unsupported algorithm',()=>assert.throws(()=>
  verifyEnergySession(token({}, {alg:'none'}),cfg),SessionError));
test('fails closed without key',()=>assert.throws(()=>
  verifyEnergySession(token(),{issuer:'neo-pass',audience:'neo-energy'}),SessionError));
