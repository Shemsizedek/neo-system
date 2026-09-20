import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';
import { randomUUID, timingSafeEqual } from 'node:crypto';
import { JsonEsopStore } from './store.mjs';
import { calculateAllocation, calculateVesting, reconcile } from '../../../modules/orange-esop/runtime.mjs';

const __dirname=path.dirname(fileURLToPath(import.meta.url));
const publicDir=path.resolve(__dirname,'../public');
const json=(res,code,payload)=>{res.writeHead(code,{'content-type':'application/json; charset=utf-8','cache-control':'no-store'});res.end(JSON.stringify(payload));};
const body=async req=>{let raw='';for await(const c of req){raw+=c;if(raw.length>1_000_000)throw Object.assign(new Error('payload_too_large'),{statusCode:413});}return raw?JSON.parse(raw):{};};

function sameSecret(a,b){const left=Buffer.from(String(a||'')),right=Buffer.from(String(b||''));return left.length===right.length&&left.length>0&&timingSafeEqual(left,right);}
function authorize(req,allowed,roleTokens){
  const requested=String(req.headers['x-neo-role']||''), supplied=String(req.headers['x-neo-role-token']||'');
  if(!allowed.includes(requested)) throw Object.assign(new Error('forbidden'),{statusCode:403});
  const expected=roleTokens?.[requested];
  if(!expected||!sameSecret(supplied,expected)) throw Object.assign(new Error('unauthorized'),{statusCode:401});
  return requested;
}
async function requireWritable(store){
  const summary=await store.summary();
  if(summary.reconciliation?.status==='RECONCILIATION_HOLD') throw Object.assign(new Error('reconciliation_hold'),{statusCode:409});
}

export function createOrangeEsopServer({store=new JsonEsopStore(),roleTokens={}}={}){
  return http.createServer(async(req,res)=>{
    try{
      const url=new URL(req.url,'http://localhost');
      if(req.method==='GET'&&url.pathname==='/health') return json(res,200,{service:'orange-esop',status:'ok'});
      if(req.method==='GET'&&url.pathname==='/ready'){
        await store.summary();
        return json(res,200,{service:'orange-esop',status:'ready'});
      }
      if(req.method==='GET'&&url.pathname==='/api/esop/public-summary'){
        const s=await store.summary();
        return json(res,200,{participantCount:s.participantCount,stewardshipEntries:s.stewardshipEntries,reconciliationStatus:s.reconciliation?.status||'PENDING',auditCount:s.auditCount});
      }
      if(req.method==='GET'&&url.pathname==='/api/esop/dashboard'){
        authorize(req,['WORLD_CHAPLAIN','ASSISTANT_GRAND_SHEIK','SECRETARY','TREASURER','PLAN_ADMINISTRATOR','ESOP_TRUSTEE','AUDITOR'],roleTokens);
        const [data,s]=await Promise.all([store.snapshot(),store.summary()]);
        return json(res,200,{participants:Object.values(data.participants||{}),participantCount:s.participantCount,stewardshipEntries:s.stewardshipEntries,reconciliation:s.reconciliation,auditCount:s.auditCount});
      }
      if(req.method==='GET'&&url.pathname==='/api/esop/participants'){
        authorize(req,['WORLD_CHAPLAIN','ASSISTANT_GRAND_SHEIK','SECRETARY','TREASURER','PLAN_ADMINISTRATOR','ESOP_TRUSTEE','AUDITOR'],roleTokens);
        return json(res,200,{items:await store.listParticipants()});
      }
      if(req.method==='POST'&&url.pathname==='/api/esop/participants'){
        authorize(req,['SECRETARY','PLAN_ADMINISTRATOR'],roleTokens); await requireWritable(store);
        const input=await body(req);
        if(!/^NEO-PART-\d{4}-\d{4,}$/.test(input.participantId||'')) return json(res,400,{error:'INVALID_PARTICIPANT_ID'});
        return json(res,201,await store.upsertParticipant(input));
      }
      if(req.method==='POST'&&url.pathname==='/api/esop/stewardship'){
        authorize(req,['SECRETARY','PLAN_ADMINISTRATOR'],roleTokens); await requireWritable(store);
        const input=await body(req);
        if(!input.participantId||!input.category||!input.activity) return json(res,400,{error:'INVALID_STEWARDSHIP_ENTRY'});
        if(!await store.getParticipant(input.participantId)) return json(res,404,{error:'PARTICIPANT_NOT_FOUND'});
        const entry={...input}; delete entry.entryId;
        return json(res,201,await store.addStewardship({...entry,entryId:randomUUID(),recordedAt:new Date().toISOString()}));
      }
      if(req.method==='POST'&&url.pathname==='/api/esop/allocation/calculate'){
        authorize(req,['PLAN_ADMINISTRATOR','ESOP_TRUSTEE'],roleTokens);
        return json(res,200,calculateAllocation(await body(req)));
      }
      if(req.method==='POST'&&url.pathname==='/api/esop/vesting/calculate'){
        authorize(req,['PLAN_ADMINISTRATOR','ESOP_TRUSTEE'],roleTokens);
        return json(res,200,calculateVesting(await body(req)));
      }
      if(req.method==='POST'&&url.pathname==='/api/esop/reconcile'){
        authorize(req,['TREASURER','ESOP_TRUSTEE','PLAN_ADMINISTRATOR'],roleTokens);
        const input=await body(req);
        const result=reconcile(input);
        const saved=await store.saveReconciliation({...result,quantities:{
          reserveUnits:input.reserveUnits??null,
          suspenseUnits:input.suspenseUnits??null,
          participantUnits:input.participantUnits??null,
          unusedAuthorizedUnits:input.unusedAuthorizedUnits??null,
          representedUnderlyingInterest:input.representedUnderlyingInterest??null,
          documentedUnderlyingInterest:input.documentedUnderlyingInterest??null
        },at:new Date().toISOString()});
        return json(res,result.status==='PASS'?200:409,saved);
      }
      if(req.method==='POST'&&url.pathname==='/api/esop/certificate'){
        authorize(req,['SECRETARY','PLAN_ADMINISTRATOR','ESOP_TRUSTEE'],roleTokens); await requireWritable(store);
        return json(res,409,{error:'AUTHORITATIVE_PLAN_DATA_NOT_AVAILABLE',message:'RCF-013 issuance remains disabled until allocation, vesting, valuation, and trustee approval are read from authoritative persisted records.'});
      }
      if(req.method==='POST'&&url.pathname==='/api/esop/statement'){
        authorize(req,['SECRETARY','PLAN_ADMINISTRATOR'],roleTokens); await requireWritable(store);
        return json(res,409,{error:'AUTHORITATIVE_PLAN_DATA_NOT_AVAILABLE',message:'RCF-015 generation remains disabled until plan-year allocation, vesting, valuation, and stewardship data are read from authoritative persisted records.'});
      }
      if(req.method==='GET'&&(url.pathname==='/'||url.pathname.startsWith('/assets/'))){
        const target=url.pathname==='/'?'index.html':url.pathname.slice('/assets/'.length),file=path.resolve(publicDir,target),relative=path.relative(publicDir,file);
        if(relative.startsWith('..')||path.isAbsolute(relative)) return json(res,403,{error:'forbidden'});
        const data=await readFile(file),type=file.endsWith('.css')?'text/css':file.endsWith('.js')?'text/javascript':'text/html';
        res.writeHead(200,{'content-type':`${type}; charset=utf-8`});return res.end(data);
      }
      json(res,404,{error:'not_found'});
    }catch(error){json(res,error.statusCode||500,{error:error.message||'internal_error'});}
  });
}
export function startOrangeEsopServer({port=Number(process.env.PORT||8794),store,roleTokens}={}){const server=createOrangeEsopServer({store,roleTokens});server.listen(port,()=>console.log(`Orange ESOP listening on :${port}`));return server;}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href) startOrangeEsopServer();
