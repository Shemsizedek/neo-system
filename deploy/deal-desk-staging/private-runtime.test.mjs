import test from 'node:test';import assert from 'node:assert/strict';import {startPrivateStaging} from './private-runtime.mjs';
const valid={CASHFLOW_STAGING_ENABLED:'true',LIVE_TRANSACTIONS:'false',REAL_CUSTOMER_INTAKE:'false',DATABASE_URL:'postgresql://example:example@db.example.invalid/staging',PGSSLMODE:'verify-full',OIDC_ISSUER:'https://id.example',OIDC_AUDIENCE:'neo-desk',OIDC_JWKS_URI:'https://id.example/jwks',STAGING_ACCESS_PROXY_VERIFIED:'true',PORT:'0'};
test('rejects public bind before opening a socket',async()=>await assert.rejects(startPrivateStaging({env:{...valid,STAGING_BIND_ADDRESS:'0.0.0.0'}}),/loopback_only/));
test('rejects missing private access certification',async()=>await assert.rejects(startPrivateStaging({env:{...valid,STAGING_ACCESS_PROXY_VERIFIED:'false'}}),/private_gateway_not_certified/));
test('rejects missing pg pool without accepting traffic',async()=>await assert.rejects(startPrivateStaging({env:valid}),/postgres_driver_required/));
test('loopback service denies anonymous operator',async()=>{
 class Pool{async query(){return {rows:[{connected:1}]}}async end(){}}
 const {server,pool}=await startPrivateStaging({env:valid,Pool,fetchImpl:async()=>({ok:true,json:async()=>({keys:[]})})});
 try{const port=server.address().port;const r=await fetch('http://127.0.0.1:'+port+'/internal/leads');assert.equal(r.status,403);}
 finally{await new Promise(resolve=>server.close(resolve));await pool.end();}
});
