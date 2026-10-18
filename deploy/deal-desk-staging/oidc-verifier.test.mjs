import test from 'node:test';import assert from 'node:assert/strict';
import {generateKeyPairSync,sign} from 'node:crypto';import {createOidcVerifier} from './oidc-verifier.mjs';
const {privateKey,publicKey}=generateKeyPairSync('rsa',{modulusLength:2048});
const key={...publicKey.export({format:'jwk'}),kid:'test-key',use:'sig',alg:'RS256'};
const now=()=>Date.UTC(2026,9,18,18)/1e3*1000;
const enc=x=>Buffer.from(JSON.stringify(x)).toString('base64url');
function token(overrides={}){const a=enc({alg:'RS256',kid:'test-key'}),b=enc({iss:'https://issuer.example',aud:'neo-deal-desk',exp:Math.floor(now()/1000)+900,iat:Math.floor(now()/1000),roles:['neo_sales_operator'],...overrides});return a+'.'+b+'.'+sign('RSA-SHA256',Buffer.from(a+'.'+b),privateKey).toString('base64url')}
const verifier=()=>createOidcVerifier({issuer:'https://issuer.example',audience:'neo-deal-desk',jwksUri:'https://issuer.example/.well-known/jwks.json',now,fetchImpl:async()=>({ok:true,json:async()=>({keys:[key]})})});
test('signed issuer and audience accepted',async()=>assert.equal((await verifier()({headers:{authorization:'Bearer '+token()}})).verified,true));
test('incorrect audience rejected',async()=>assert.rejects(verifier()({headers:{authorization:'Bearer '+token({aud:'other'})}}),/jwt_verification_failed/));
test('expired token rejected',async()=>assert.rejects(verifier()({headers:{authorization:'Bearer '+token({exp:Math.floor(now()/1000)-1})}}),/jwt_verification_failed/));
test('tampered token rejected',async()=>{const t=token(),p=t.split('.');p[1]=enc({iss:'https://issuer.example',aud:'neo-deal-desk',exp:Math.floor(now()/1000)+2000,iat:Math.floor(now()/1000)});await assert.rejects(verifier()({headers:{authorization:'Bearer '+p.join('.')}}),/jwt_verification_failed/)});
test('untrusted JWKS origin rejected',()=>assert.throws(()=>createOidcVerifier({issuer:'https://issuer.example',audience:'x',jwksUri:'https://evil.example/jwks'}),/jwks_origin_mismatch/));
