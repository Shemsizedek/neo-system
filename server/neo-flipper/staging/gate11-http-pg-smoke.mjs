/**
 * Gate 11 manual, LOCAL-ONLY HTTP -> real Neon smoke test.
 * No persistent runtime, no public listener, no production credentials.
 * THIS IS SYNTHETIC ASSURANCE ONLY: test-signed JWT and fixture attestations.
 *
 * Invocation: NEO_FLIPPER_GATE11_RUN=scratch-only NEO_FLIPPER_SCRATCH_DATABASE_URL=...
 *             node server/neo-flipper/staging/gate11-http-pg-smoke.mjs
 * pg is an optional integration-test dependency, loaded only when explicitly run.
 */
import {createServer} from 'node:http';
import {once} from 'node:events';
import {createHmac,randomBytes} from 'node:crypto';
import {assertScratchDatabaseUrl,SCRATCH_DB} from './gate11-config.mjs';
import {createGate9ScratchRuntime} from '../gate9-scratch-runtime.mjs';

function deny(message){throw Object.assign(new Error(message),{code:message})}
const now=()=>Date.now();
export async function runScratchSmoke({connectionString,loadPool,clock=now}={}){
 if(process.env.NEO_FLIPPER_GATE11_RUN!=='scratch-only')deny('explicit_scratch_run_flag_required');
 const checked=assertScratchDatabaseUrl(connectionString);
 if(checked.branchId!==SCRATCH_DB.branchId)deny('scratch_branch_mismatch');
 if(typeof loadPool!=='function')deny('real_postgres_pool_factory_required');
 // The pool must establish an actual server-authenticated, TLS-verified PG session.
 const pool=await loadPool(connectionString);
 if(!pool||typeof pool.query!=='function'||typeof pool.connect!=='function'||typeof pool.end!=='function')
  deny('pg_pool_invalid');
 let server;
 try{
  const check=await pool.query('SELECT current_user AS role_name,current_database() AS db');
  if(check.rows?.[0]?.role_name!==SCRATCH_DB.role||check.rows[0].db!==SCRATCH_DB.database)
   deny('unexpected_login_or_database');
  const secret=randomBytes(48);
  const scopes=['buyer:read','buyer:write','listing:read','listing:write','deal:read','audit:read'];
  let revoked=false;
  const {handler}=await createGate9ScratchRuntime({
   pool,issuerSecret:secret,clock,
   getCurrentAccess:async()=>({active:true,scopes}),
   isRevoked:async()=>revoked,
   verifyBuyer:async(b)=>b.identityRef.startsWith('fixture:')&&b.consentRef.startsWith('fixture:')&&b.fundsRef.startsWith('fixture:'),
   verifyListing:async(l)=>l.statusEvidenceRef.startsWith('fixture:')&&l.sourceGrantRef.startsWith('fixture:')&&l.sourceUrl.startsWith('https://example.org/'),
   verifyValuation:async(v)=>v.valuationEvidenceRef.startsWith('fixture:'),
   matchBuyer:async({buyer,listing})=>
    buyer.markets.includes(listing.market)&&buyer.assetTypes.includes(listing.assetType)
     ?{status:'indicative_buyer_first_ceiling',maximumSellerContractPriceUsd:140000,estimatedNetAssignmentFeeUsd:8000}
     :{status:'not_a_match'},
   // The branch is pinned by independently verified Neon compute hostname, DB identity and role.
   verifyScratchBranch:async(m)=>m.branchId===checked.branchId&&m.role===checked.role&&m.database===checked.database
  });
  server=createServer(handler);
  server.listen(0,'127.0.0.1');
  await once(server,'listening');
  const base='http://127.0.0.1:'+server.address().port;
  function token(){
   const t=Math.floor(clock()/1000);
   const h=Buffer.from(JSON.stringify({alg:'HS256',typ:'JWT'})).toString('base64url');
   const p=Buffer.from(JSON.stringify({iss:'neo-pass',aud:'neo-flipper-staging',
    active:true,sub:'neopass:gate11-fixture',jti:randomBytes(12).toString('hex'),
    iat:t-3,exp:t+120,scopes})).toString('base64url');
   return h+'.'+p+'.'+createHmac('sha256',secret).update(h+'.'+p).digest('base64url');
  }
  const signed=token();
  async function call(path,method='GET',body,key,auth=signed){
   const r=await fetch(base+path,{method,headers:{
    authorization:'Bearer '+auth,'content-type':'application/json',
    ...(key?{'idempotency-key':key}:{})
   },body:body===undefined?undefined:JSON.stringify(body)});
   return {status:r.status,data:await r.json()};
  }
  const suffix=randomBytes(5).toString('hex').toUpperCase();
  const buyerId='B-GATE9HTT'+suffix, listingId='LIST-GATE9HTT'+suffix;
  const when=new Date(clock()).toISOString();
  const buyer={buyerId,identityRef:'fixture:gate11-id',consentRef:'fixture:gate11-consent',
   consentAt:when,fundsRef:'fixture:gate11-funds',fundsVerifiedAt:when,
   optedIn:true,consentScope:'property_offers',maxAllInUsd:220000,
   markets:['Houston'],assetTypes:['single_family']};
  const listing={id:listingId,address:'Synthetic Gate 11 Test Lane, Houston, Texas',
   market:'Houston',assetType:'single_family',listPriceUsd:180000,
   daysOnMarket:200,jurisdiction:'US-TX',sourceUrl:'https://example.org/neo-flipper-gate11',
   status:'active',statusVerifiedAt:when,statusEvidenceRef:'fixture:gate11-status',
   sourceGrantRef:'fixture:gate11-license',sourceType:'licensed_feed',providerId:'fixture-provider'};
  const key=tag=>'G11-'+suffix+'-'+tag;
  const denied=await call('/v1/flipper/buyers','GET',undefined,undefined,'invalid.jwt.value');
  if(denied.status!==401)deny('forged_token_was_accepted');
  const saved=await call('/v1/flipper/buyers','POST',buyer,key('buyer'));
  if(saved.status!==200||saved.data.stored!==true)deny('http_pg_buyer_insert_failed');
  const again=await call('/v1/flipper/buyers','POST',buyer,key('buyer'));
  if(again.status!==200||again.data.idempotent!==true)deny('idempotency_replay_failed');
  const conflict=await call('/v1/flipper/buyers','POST',{...buyer,maxAllInUsd:999999},key('buyer'));
  if(conflict.status!==409)deny('idempotency_hash_conflict_not_enforced');
  const imported=await call('/v1/flipper/listings/import','POST',listing,key('listing'));
  if(imported.status!==200||imported.data.stored!==true)deny('http_pg_listing_insert_failed');
  const preview=await call('/v1/flipper/previews','POST',{
   listingId,valuation:{},costs:{},valuationEvidenceRef:'fixture:gate11-valuation'
  },key('preview'));
  if(preview.status!==200||!preview.data.matches.some(x=>x.buyerId===buyerId)||
   preview.data.recognizedRevenueUsd!==0)deny('http_pg_preview_failed');
  const suppressed=await call('/v1/flipper/buyers/'+buyerId+'/suppress','POST',{},key('suppress'));
  if(suppressed.status!==200||suppressed.data.suppressed!==true)deny('http_pg_buyer_suppression_failed');
  const after=await call('/v1/flipper/previews','POST',{
   listingId,valuation:{},costs:{},valuationEvidenceRef:'fixture:gate11-valuation'
  },key('after'));
  if(after.status!==200||after.data.matches.some(x=>x.buyerId===buyerId))deny('suppressed_buyer_remained_in_match');
  revoked=true;
  if((await call('/v1/flipper/buyers')).status!==401)deny('revoked_token_accepted');
  const proof=await pool.query(
   "SELECT (SELECT count(*) FROM neo_flipper.buyers WHERE buyer_id=$1) AS buyers,"+
   "(SELECT count(*) FROM neo_flipper.listings WHERE listing_id=$2) AS listings,"+
   "(SELECT count(*) FROM neo_flipper.deal_previews WHERE request_key=$3) AS previews,"+
   "(SELECT count(*) FROM neo_flipper.buyers WHERE buyer_id=$1 AND suppressed_at IS NULL) AS eligible",
   [buyerId,listingId,key('preview')]);
  const row=proof.rows?.[0];
  if(!row||String(row.buyers)!=='1'||String(row.listings)!=='1'||String(row.previews)!=='1'||String(row.eligible)!=='0')
   deny('database_persistence_evidence_missing');
  return Object.freeze({passed:true,mode:'scratch_only',branch:SCRATCH_DB.branchId,
   checks:['token_signature','buyer_insert','replay','replay_conflict','listing_insert','preview',
    'revenue_zero','buyer_suppression','post_optout_preview','revocation','pg_persistence'],
   buyerId,listingId,recognizedRevenueUsd:0});
 }finally{
  if(server)await new Promise(resolve=>server.close(()=>resolve()));
  await pool.end();
 }
}

if(process.argv[1]&&import.meta.url===new URL('file://'+process.argv[1]).href){
 try{
  const pg=await import('pg').catch(()=>deny('pg_driver_not_installed'));
  const {Pool}=pg.default||pg;
  const summary=await runScratchSmoke({
   connectionString:process.env.NEO_FLIPPER_SCRATCH_DATABASE_URL,
   loadPool:async url=>new Pool({connectionString:url,ssl:{rejectUnauthorized:true},max:2,connectionTimeoutMillis:7000,query_timeout:10000})
  });
  process.stdout.write(JSON.stringify(summary)+'\n');
 }catch(e){process.stderr.write('Gate11 blocked: '+(e.code||'scratch_validation_failed')+'\n');process.exitCode=1}
}
