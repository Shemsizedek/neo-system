import {createServer} from 'node:http';
import {pathToFileURL} from 'node:url';
const port=Number(process.env.PORT||10000);
const bind=process.env.STAGING_BIND_ADDRESS||'127.0.0.1';
export function readiness(env=process.env){
  const problems=[];
  if(env.CASHFLOW_STAGING_ENABLED!=='true')problems.push('staging_disabled');
  if(!env.DATABASE_URL||!env.DATABASE_URL.startsWith('postgresql://'))problems.push('dedicated_database_missing');
  if(!env.OIDC_ISSUER||!env.OIDC_AUDIENCE||!env.OIDC_JWKS_URI)problems.push('oidc_configuration_missing');
  if(!env.STAGING_ACCESS_PROXY_VERIFIED||env.STAGING_ACCESS_PROXY_VERIFIED!=='true')problems.push('private_gateway_not_verified');
  if(env.LIVE_TRANSACTIONS!=='false')problems.push('live_transactions_must_be_disabled');
  return {ready:problems.length===0,problems};
}
export function server(env=process.env){
 return createServer((req,res)=>{
  res.setHeader('Content-Type','application/json; charset=utf-8');
  res.setHeader('Cache-Control','no-store');
  res.setHeader('X-Content-Type-Options','nosniff');
  // Only limited liveness response; no PII, leads or operator data.
  if(req.method==='GET'&&req.url==='/healthz'){
    res.statusCode=200;return res.end(JSON.stringify({ok:true,service:'neo-deal-desk-staging-gate'}));
  }
  res.statusCode=503;return res.end(JSON.stringify({error:'staging_not_certified'}));
 });
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
  const r=readiness();
  if(!r.ready){console.error('Staging blocked:',r.problems.join(','));process.exit(1);}
  if(bind==='0.0.0.0'){console.error('Public bind prohibited until separate gateway certification');process.exit(1);}
  server().listen(port,bind,()=>console.log('NEO Deal Desk staging gate running on restricted bind'));
}
