import {createServer} from 'node:http';
import {mkdir,readFile,writeFile,rename} from 'node:fs/promises';
import {join, resolve} from 'node:path';
import {createPilot,transition,verifyChain} from './escrow.mjs';
const root=process.env.NEO_REALTY_DATA_DIR||'.neo-realty-sandbox';
const bearer=process.env.NEO_REALTY_SANDBOX_TOKEN;
if(!bearer && process.env.NODE_ENV!=='test') throw new Error('NEO_REALTY_SANDBOX_TOKEN required');
const send=(res,status,obj)=>{res.writeHead(status,{'content-type':'application/json','cache-control':'no-store'});res.end(JSON.stringify(obj));};
async function save(p){await mkdir(root,{recursive:true});const f=join(root,p.id+'.json');const tmp=f+'.tmp';await writeFile(tmp,JSON.stringify(p));await rename(tmp,f);}
export const server=createServer(async(req,res)=>{
 try{
  if(req.method==='GET' && (req.url==='/' || req.url==='/index.html')){const html=await readFile(resolve('apps/neo-realty/rwa-004/index.html'),'utf8');res.writeHead(200,{'content-type':'text/html; charset=utf-8','cache-control':'no-store','content-security-policy':"default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; connect-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'"});return res.end(html);}
  if(req.headers.authorization!=='Bearer '+bearer || !bearer)return send(res,401,{error:'Unauthorized'});
  if(req.method==='POST'&&req.url==='/api/rwa/pilots'){let raw='';for await(const chunk of req){raw+=chunk;if(raw.length>16384)return send(res,413,{error:'Request too large'});}const p=createPilot(JSON.parse(raw||'{}'));await save(p);return send(res,201,p);}
  const m=req.url.match(/^\/api\/rwa\/pilots\/([0-9a-f-]{36})(\/events)?$/);
  if(!m)return send(res,404,{error:'Not found'});
  let p=JSON.parse(await readFile(join(root,m[1]+'.json'),'utf8'));
  if(!verifyChain(p))return send(res,409,{error:'Evidence-chain integrity failure'});
  if(req.method==='GET'&&!m[2])return send(res,200,p);
  if(req.method==='POST'&&m[2]){let raw='';for await(const chunk of req){raw+=chunk;if(raw.length>1024)return send(res,413,{error:'Request too large'});}const e=transition(p,JSON.parse(raw).type);await save(p);return send(res,201,e);}
  return send(res,405,{error:'Method not allowed'});
 }catch(e){return send(res,e.code==='ENOENT'?404:400,{error:e.code==='ENOENT'?'Unknown pilot':e.message});}
});
if(process.argv[1] && import.meta.url===new URL('file://'+process.argv[1]).href)server.listen(Number(process.env.PORT||8787),'127.0.0.1');
