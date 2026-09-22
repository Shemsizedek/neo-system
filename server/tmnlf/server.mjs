import http from 'node:http';
import { createTmnlfStore } from './store.mjs';
import { createTmnlfEvidenceBridge } from './evidence-bridge.mjs';

const PORT=Number(process.env.TMNLF_PORT||8792);
const DB_PATH=process.env.TMNLF_DB_PATH||'data/tmnlf.sqlite';
const EVIDENCE_DB_PATH=process.env.NEO_EVIDENCE_DB_PATH||'data/neo-evidence-vault.sqlite';
const ALLOWED_ORIGIN=process.env.TMNLF_ALLOWED_ORIGIN||'https://shemsizedek.github.io';
const API_TOKEN=process.env.TMNLF_API_TOKEN||'';
const PERSISTENT_VOLUME=process.env.TMNLF_PERSISTENT_VOLUME==='true';

const cors=res=>{res.setHeader('Access-Control-Allow-Origin',ALLOWED_ORIGIN);res.setHeader('Access-Control-Allow-Headers','Authorization, Content-Type, X-Operator');res.setHeader('Access-Control-Allow-Methods','GET,POST,OPTIONS')};
const send=(res,status,body)=>{cors(res);res.writeHead(status,{'content-type':'application/json','cache-control':'no-store'});res.end(JSON.stringify(body))};
const authorized=req=>!API_TOKEN||req.headers.authorization===`Bearer ${API_TOKEN}`;
const actor=req=>String(req.headers['x-operator']||'tmnlf-operator');
async function body(req){const chunks=[];for await(const c of req)chunks.push(c);return chunks.length?JSON.parse(Buffer.concat(chunks).toString('utf8')):{}}

export function createHandler(store,evidence){
 return async(req,res)=>{try{
  if(req.method==='OPTIONS'){cors(res);res.writeHead(204);return res.end()}
  const url=new URL(req.url||'/',`http://${req.headers.host||'localhost'}`);
  if(url.pathname==='/health')return send(res,200,{ok:true,service:'tmnlf',storage:{engine:'sqlite-wal',persistent:PERSISTENT_VOLUME,database:DB_PATH,evidenceDatabase:EVIDENCE_DB_PATH}});
  if(!authorized(req))return send(res,401,{error:'unauthorized'});
  if(url.pathname==='/matters'&&req.method==='GET')return send(res,200,{ok:true,persistent:PERSISTENT_VOLUME,matters:store.list()});
  if(url.pathname==='/matters'&&req.method==='POST')return send(res,201,{ok:true,matter:store.create(await body(req),actor(req))});
  const audit=url.pathname.match(/^\/matters\/([^/]+)\/audit$/);
  if(audit&&req.method==='GET')return send(res,200,{ok:true,events:store.listAudit(decodeURIComponent(audit[1]))});
  const ev=url.pathname.match(/^\/matters\/([^/]+)\/evidence$/);
  if(ev&&req.method==='GET')return send(res,200,{ok:true,items:evidence.list(decodeURIComponent(ev[1]))});
  if(ev&&req.method==='POST')return send(res,201,{ok:true,item:evidence.register(decodeURIComponent(ev[1]),await body(req),actor(req))});
  const custody=url.pathname.match(/^\/matters\/([^/]+)\/custody$/);
  if(custody&&req.method==='GET')return send(res,200,{ok:true,events:evidence.audit(decodeURIComponent(custody[1]))});
  return send(res,404,{error:'not_found'});
 }catch(error){return send(res,500,{error:'internal_error',message:error instanceof Error?error.message:'unknown'})}}
}
export function startServer({port=PORT,dbPath=DB_PATH,evidenceDbPath=EVIDENCE_DB_PATH}={}){
 const store=createTmnlfStore(dbPath),evidence=createTmnlfEvidenceBridge(evidenceDbPath),server=http.createServer(createHandler(store,evidence));
 server.listen(port,()=>console.log(`TMNLF runtime listening on :${port}`));return {server,store,evidence};
}
if(import.meta.url===`file://${process.argv[1]}`)startServer();
