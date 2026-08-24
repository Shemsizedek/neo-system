import http from 'node:http';
import { createStore, VersionConflictError } from './store.mjs';
import { createAuth } from './auth.mjs';

const PORT=Number(process.env.NEO_COUNTER_PORT||8787);
const DB_PATH=process.env.NEO_COUNTER_DB_PATH||'data/neo-counter.sqlite';
const ALLOWED_ORIGIN=process.env.NEO_COUNTER_ALLOWED_ORIGIN||'https://shemsizedek.github.io';

function applyCors(res){
  res.setHeader('Access-Control-Allow-Origin',ALLOWED_ORIGIN);
  res.setHeader('Access-Control-Allow-Headers','Authorization, Content-Type');
  res.setHeader('Access-Control-Allow-Methods','GET,POST,DELETE,OPTIONS');
}
function send(res,status,body){applyCors(res);res.writeHead(status,{'content-type':'application/json','cache-control':'no-store'});res.end(JSON.stringify(body));}
async function readJson(req){const chunks=[];for await(const chunk of req) chunks.push(chunk);return chunks.length?JSON.parse(Buffer.concat(chunks).toString('utf8')):{};}

export function createHandler(store,{auth=createAuth(store.db)}={}){
  return async(req,res)=>{
    try{
      if(req.method==='OPTIONS'){applyCors(res);res.writeHead(204);return res.end();}
      const url=new URL(req.url||'/',`http://${req.headers.host||'localhost'}`);
      if(url.pathname==='/health') return send(res,200,{ok:true,service:'neo-counter-backend'});

      if(url.pathname==='/session' && req.method==='POST'){
        const body=await readJson(req);
        const session=auth.createSession(body);
        return session?send(res,201,session):send(res,401,{error:'invalid_credentials'});
      }

      const principal=auth.sessionPrincipal(req);
      if(!principal) return send(res,401,{error:'unauthorized'});
      if(url.pathname==='/session/me' && req.method==='GET') return send(res,200,{merchantId:principal.merchantId,terminalId:principal.terminalId,staffId:principal.staffId,permissions:principal.permissions,expiresAt:principal.expiresAt||null});
      if(url.pathname==='/session' && req.method==='DELETE'){auth.revoke(req);return send(res,200,{ok:true});}

      const snapshot=url.pathname.match(/^\/merchant\/([^/]+)\/snapshot$/);
      if(snapshot && req.method==='GET'){
        const merchantId=decodeURIComponent(snapshot[1]);
        if(!auth.can(principal,'register',merchantId) && !auth.can(principal,'settings',merchantId)) return send(res,403,{error:'forbidden'});
        const afterVersion=Number(url.searchParams.get('afterVersion')||0);
        const merchantOps=store.getState(merchantId,'merchant_ops');
        if(!merchantOps || merchantOps.version<=afterVersion){applyCors(res);res.writeHead(204,{'cache-control':'no-store'});return res.end();}
        return send(res,200,{merchantOps,cursor:String(merchantOps.version)});
      }

      if(url.pathname==='/sync' && req.method==='POST'){
        const envelope=await readJson(req);
        if(!envelope?.merchantId||!envelope?.entity||!envelope?.terminalId||typeof envelope.version!=='number') return send(res,400,{error:'invalid_envelope'});
        if(principal.kind!=='admin' && principal.terminalId!==envelope.terminalId) return send(res,403,{error:'terminal_mismatch'});
        const permission=envelope.entity==='merchant_ops'?'settings':'register';
        if(!auth.can(principal,permission,envelope.merchantId)) return send(res,403,{error:'forbidden'});
        try{return send(res,200,store.putEnvelope(envelope));}
        catch(error){if(error instanceof VersionConflictError) return send(res,409,error.remote||{error:'version_conflict'});throw error;}
      }

      const events=url.pathname.match(/^\/merchant\/([^/]+)\/events$/);
      if(events){
        const merchantId=decodeURIComponent(events[1]);
        if(req.method==='GET'){
          if(!auth.can(principal,'reports',merchantId) && !auth.can(principal,'settings',merchantId)) return send(res,403,{error:'forbidden'});
          return send(res,200,{events:store.listEvents(merchantId,Number(url.searchParams.get('limit')||100))});
        }
        if(req.method==='POST'){
          if(!auth.can(principal,'register',merchantId)) return send(res,403,{error:'forbidden'});
          const body=await readJson(req);
          if(!body.type) return send(res,400,{error:'event_type_required'});
          const terminalId=principal.kind==='admin'?(body.terminalId||'admin'):principal.terminalId;
          return send(res,201,store.appendEvent({...body,merchantId,terminalId}));
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
