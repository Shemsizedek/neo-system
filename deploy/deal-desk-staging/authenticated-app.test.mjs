import test from 'node:test';import assert from 'node:assert/strict';
import {buildSecuredStagingHandler} from './authenticated-app.mjs';
const cfg={CASHFLOW_STAGING_ENABLED:'true',LIVE_TRANSACTIONS:'false',REAL_CUSTOMER_INTAKE:'false',DATABASE_URL:'postgresql://redacted@db.example/stage',PGSSLMODE:'verify-full',OIDC_ISSUER:'https://id.example',OIDC_AUDIENCE:'neo-desk',OIDC_JWKS_URI:'https://id.example/jwks'};
test('no certified gateway means no handler',()=>assert.throws(()=>buildSecuredStagingHandler({env:cfg,store:{listMetadata:async()=>[]}}),/verified_private_gateway_required/));
test('missing lead store blocks construction',()=>assert.throws(()=>buildSecuredStagingHandler({env:{...cfg,STAGING_ACCESS_PROXY_VERIFIED:'true'}}),/lead_store_required/));
test('unverified request cannot read leads',async()=>{const handler=buildSecuredStagingHandler({env:{...cfg,STAGING_ACCESS_PROXY_VERIFIED:'true'},store:{listMetadata:async()=>[{id:'synthetic'}]},fetchImpl:async()=>({ok:true,json:async()=>({keys:[]})})});let status=0;await handler({method:'GET',url:'/internal/leads',headers:{}},{writeHead(s){status=s},end(){}});assert.equal(status,403)});
