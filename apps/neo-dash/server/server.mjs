import http from 'node:http';
import { createMemoryStore } from './store.mjs';
import { PROVIDER_ROLES, assertSettlementAsset, assertTransition, deriveQuote, providerCanServe } from './domain.mjs';

const PORT=Number(process.env.NEO_DASH_PORT||8791);
const ADMIN_TOKEN=process.env.NEO_DASH_ADMIN_TOKEN||'';
const NEO_COUNTER_CHECKOUT_URL=process.env.NEO_COUNTER_CHECKOUT_URL||'';
const NEO_COUNTER_API_KEY=process.env.NEO_COUNTER_API_KEY||'';

function send(res,status,body){res.writeHead(status,{'content-type':'application/json','cache-control':'no-store'});res.end(JSON.stringify(body));}
async function readJson(req){const chunks=[];for await(const chunk of req) chunks.push(chunk);return chunks.length?JSON.parse(Buffer.concat(chunks).toString('utf8')):{};}
function bearer(req){const value=String(req.headers.authorization||'');return value.startsWith('Bearer ')?value.slice(7):'';}
function principal(req){return String(req.headers['x-neo-pass-account']||'').trim();}
function requirePrincipal(req,res){const id=principal(req);if(!id){send(res,401,{error:'neopass_identity_required'});return null;}return id;}
function adminAllowed(req){return Boolean(ADMIN_TOKEN) && bearer(req)===ADMIN_TOKEN;}

export function createNeoCounterCheckoutAdapter({url=NEO_COUNTER_CHECKOUT_URL,apiKey=NEO_COUNTER_API_KEY,fetchImpl=fetch}={}){
  return async({jobId,commercialAmountWorld,settlementAsset})=>{
    if(!url) throw new Error('neo_counter_checkout_not_configured');
    const headers={'content-type':'application/json'};
    if(apiKey) headers.authorization=`Bearer ${apiKey}`;
    const response=await fetchImpl(url,{method:'POST',headers,body:JSON.stringify({referenceId:jobId,commercialAmountWorld,settlementAsset})});
    const body=await response.json().catch(()=>({}));
    if(!response.ok) throw new Error(`neo_counter_checkout_failed:${response.status}`);
    const checkoutId=body.checkoutId||body.id;
    if(!checkoutId) throw new Error('neo_counter_checkout_id_missing');
    return {checkoutId:String(checkoutId)};
  };
}

export function createHandler({store=createMemoryStore(),checkout=createNeoCounterCheckoutAdapter()}={}){
  return async(req,res)=>{
    try{
      const url=new URL(req.url||'/',`http://${req.headers.host||'localhost'}`);
      if(req.method==='GET' && url.pathname==='/health') return send(res,200,{ok:true,service:'neo-dash',payoutExecutionEnabled:false});

      if(req.method==='POST' && url.pathname==='/providers/applications'){
        const accountId=requirePrincipal(req,res);if(!accountId) return;
        const body=await readJson(req);
        const requestedRoles=Array.isArray(body.requestedRoles)?body.requestedRoles:[];
        if(!requestedRoles.length || requestedRoles.some(role=>!PROVIDER_ROLES.has(role))) return send(res,400,{error:'invalid_provider_roles'});
        return send(res,201,store.createProviderApplication({accountId,requestedRoles}));
      }

      const approval=url.pathname.match(/^\/ops\/providers\/([^/]+)\/approve$/);
      if(req.method==='POST' && approval){
        if(!adminAllowed(req)) return send(res,403,{error:'admin_forbidden'});
        const body=await readJson(req);
        const roles=Array.isArray(body.roles)?body.roles:[];
        if(!roles.length || roles.some(role=>!PROVIDER_ROLES.has(role))) return send(res,400,{error:'invalid_provider_roles'});
        const provider=store.approveProvider(decodeURIComponent(approval[1]),{roles,authorities:body.authorities||{}});
        return provider?send(res,200,provider):send(res,404,{error:'provider_not_found'});
      }

      if(req.method==='POST' && url.pathname==='/quotes'){
        const accountId=requirePrincipal(req,res);if(!accountId) return;
        const body=await readJson(req);
        const derived=deriveQuote(body);
        const quote=store.createQuote({...derived,customerId:accountId,pickup:body.pickup||null,dropoff:body.dropoff||null});
        return send(res,201,quote);
      }

      if(req.method==='POST' && url.pathname==='/jobs'){
        const accountId=requirePrincipal(req,res);if(!accountId) return;
        const body=await readJson(req);
        const quote=store.getQuote(body.quoteId);
        if(!quote || quote.customerId!==accountId) return send(res,404,{error:'quote_not_found'});
        const settlementAsset=assertSettlementAsset(body.settlementAsset);
        const job=store.createJob({serviceType:quote.serviceType,customerId:accountId,pickup:quote.pickup,dropoff:quote.dropoff,commercialAmountWorld:quote.commercialAmountWorld,components:quote.components,settlementAsset,state:'MATCHING'});
        return send(res,201,job);
      }

      const match=url.pathname.match(/^\/jobs\/([^/]+)\/match$/);
      if(req.method==='POST' && match){
        if(!adminAllowed(req)) return send(res,403,{error:'admin_forbidden'});
        const job=store.getJob(decodeURIComponent(match[1]));
        if(!job) return send(res,404,{error:'job_not_found'});
        const provider=store.listProviders().find(candidate=>providerCanServe(candidate,job.serviceType));
        if(!provider){job.state='NO_PROVIDER';store.saveJob(job);return send(res,409,{error:'no_provider',job});}
        job.providerId=provider.id;job.state='OFFERED';store.saveJob(job);
        return send(res,200,job);
      }

      const accept=url.pathname.match(/^\/jobs\/([^/]+)\/accept$/);
      if(req.method==='POST' && accept){
        const accountId=requirePrincipal(req,res);if(!accountId) return;
        const job=store.getJob(decodeURIComponent(accept[1]));
        if(!job) return send(res,404,{error:'job_not_found'});
        const provider=job.providerId?store.getProvider(job.providerId):null;
        if(!provider || provider.accountId!==accountId) return send(res,403,{error:'provider_forbidden'});
        assertTransition(job.state,'ACCEPTED');
        job.state='ACCEPTED';store.saveJob(job);
        provider.activeExclusiveJobId=job.id;store.saveProvider(provider);
        return send(res,200,job);
      }

      const checkoutRoute=url.pathname.match(/^\/jobs\/([^/]+)\/checkout$/);
      if(req.method==='POST' && checkoutRoute){
        const accountId=requirePrincipal(req,res);if(!accountId) return;
        const job=store.getJob(decodeURIComponent(checkoutRoute[1]));
        if(!job || job.customerId!==accountId) return send(res,404,{error:'job_not_found'});
        assertTransition(job.state,'PAYMENT_PENDING');
        job.state='PAYMENT_PENDING';store.saveJob(job);
        const result=await checkout({jobId:job.id,commercialAmountWorld:job.commercialAmountWorld,settlementAsset:job.settlementAsset});
        job.checkoutId=result.checkoutId;store.saveJob(job);
        return send(res,200,job);
      }

      const transition=url.pathname.match(/^\/jobs\/([^/]+)\/state$/);
      if(req.method==='POST' && transition){
        if(!adminAllowed(req)) return send(res,403,{error:'admin_forbidden'});
        const job=store.getJob(decodeURIComponent(transition[1]));
        if(!job) return send(res,404,{error:'job_not_found'});
        const body=await readJson(req);
        assertTransition(job.state,body.state);
        job.state=body.state;
        store.saveJob(job);
        if(['COMPLETED','SETTLED','CLOSED','CANCELLED','REFUNDED','DISPUTED','SUSPENDED'].includes(job.state) && job.providerId){
          const provider=store.getProvider(job.providerId);
          if(provider?.activeExclusiveJobId===job.id){provider.activeExclusiveJobId=null;store.saveProvider(provider);}
        }
        return send(res,200,job);
      }

      const jobRoute=url.pathname.match(/^\/jobs\/([^/]+)$/);
      if(req.method==='GET' && jobRoute){
        const accountId=requirePrincipal(req,res);if(!accountId) return;
        const job=store.getJob(decodeURIComponent(jobRoute[1]));
        if(!job) return send(res,404,{error:'job_not_found'});
        const provider=job.providerId?store.getProvider(job.providerId):null;
        if(job.customerId!==accountId && provider?.accountId!==accountId) return send(res,403,{error:'job_forbidden'});
        return send(res,200,job);
      }

      return send(res,404,{error:'not_found'});
    }catch(error){
      const message=error instanceof Error?error.message:'unknown';
      const badRequest=message.startsWith('unsupported_')||message.startsWith('invalid_transition');
      const unavailable=message.startsWith('neo_counter_');
      return send(res,unavailable?503:badRequest?400:500,{error:message});
    }
  };
}

export function startServer({port=PORT,store=createMemoryStore(),checkout=createNeoCounterCheckoutAdapter()}={}){
  const server=http.createServer(createHandler({store,checkout}));
  server.listen(port,()=>console.log(`NEO Dash listening on :${port}`));
  return {server,store};
}

if(import.meta.url===`file://${process.argv[1]}`) startServer();
