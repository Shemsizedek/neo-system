import http from 'node:http';
import { createHash, timingSafeEqual } from 'node:crypto';
import { createStore, VersionConflictError } from './store.mjs';

const PORT=Number(process.env.NEO_COUNTER_PORT||8787);
const DB_PATH=process.env.NEO_COUNTER_DB_PATH||'data/neo-counter.sqlite';
const API_KEY_HASH=process.env.NEO_COUNTER_API_KEY_HASH||'';
const ALLOWED_ORIGIN=process.env.NEO_COUNTER_ALLOWED_ORIGIN||'https://shemsizedek.github.io';

function hash(value){return createHash('sha256').update(value).digest();}
function isAuthorized(req){
  if(!API_KEY_HASH) return true;
  const auth=req.headers.authorization||'';
  const token=auth.startsWith('Bearer ')?auth.slice(7):'';
  if(!token) return false;
  const expected=Buffer.from(API_KEY_HASH,'hex');
  const actual=hash(token);
  return expected.length===actual.length && timingSafeEqual(expected,actual);
}
function applyCors(res){
  res.setHeader('Access-Control-Allow-Origin',ALLOWED_ORIGIN);
  res.setHeader('Access-Control-Allow-Headers','Authorization, Content-Type');
  res.setHeader('Access-Control-Allow-Methods','GET,POST,OPTIONS');
}
function send(res,status,body){applyCors(res);res.writeHead(status,{'content-type':'application/json'});res.end(JSON.stringify(body));}
async function readJson(req){const chunks=[];for await(const chunk of req) chunks.push(chunk);return chunks.length?JSON.parse(Buffer.concat(chunks).toString('utf8')):{};}

export function createHandler(store){
  return async(req,res)=>{
    try{
      if(req.method==='OPTIONS'){applyCors(res);res.writeHead(204);return res.end();}
      if(!isAuthorized(req)) return send(res,401,{error:'unauthorized'});
      const url=new URL(req.url||'/',`http://${req.headers.host||'localhost'}`);
      if(url.pathname==='/health') return send(res,200,{ok:true,service:'neo-counter-backend'});

      const snapshot=url.pathname.match(/^\/merchant\/([^/]+)\/snapshot$/);
      if(snapshot && req.method==='GET'){
        const merchantId=decodeURIComponent(snapshot[1]);
        const afterVersion=Number(url.searchParams.get('afterVersion')||0);
        const merchantOps=store.getState(merchantId,'merchant_ops');
        if(!merchantOps || merchantOps.version<=afterVersion){applyCors(res);res.writeHead(204);return res.end();}
        return send(res,200,{merchantOps,cursor:String(merchantOps.version)});
      }

      if(url.pathname==='/sync' && req.method==='POST'){
        const envelope=await readJson(req);
        if(!envelope?.merchantId||!envelope?.entity||!envelope?.terminalId||typeof envelope.version!=='number') return send(res,400,{error:'invalid_envelope'});
        try{return send(res,200,store.putEnvelope(envelope));}
        catch(error){if(error instanceof VersionConflictError) return send(res,409,error.remote||{error:'version_conflict'});throw error;}
      }

      const events=url.pathname.match(/^\/merchant\/([^/]+)\/events$/);
      if(events){
        const merchantId=decodeURIComponent(events[1]);
        if(req.method==='GET') return send(res,200,{events:store.listEvents(merchantId,Number(url.searchParams.get('limit')||100))});
        if(req.method==='POST'){
          const body=await readJson(req);
          if(!body.type) return send(res,400,{error:'event_type_required'});
          return send(res,201,store.appendEvent({...body,merchantId}));
        }
      }

      return send(res,404,{error:'not_found'});
    }catch(error){return send(res,500,{error:'internal_error',message:error instanceof Error?error.message:'unknown'});}
  };
}

export function startServer({port=PORT,dbPath=DB_PATH}={}){
  const store=createStore(dbPath);
  const server=http.createServer(createHandler(store));
  server.listen(port,()=>console.log(`NEO Counter backend listening on :${port}`));
  return {server,store};
}

if(import.meta.url===`file://${process.argv[1]}`) startServer();
