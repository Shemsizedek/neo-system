import {createServer,request as httpRequest} from 'node:http'
import {openTribunalDb} from './db.mjs'
import {TribunalService} from './service.mjs'
import {ensurePublicDocketSchema} from './publicDocket.mjs'
import {handlePublicDocketRoute} from './publicDocketRouter.mjs'
import {neoPacerDocketHtml} from './neoPacerDocketUi.mjs'

const publicPort=Number(process.env.PORT||8787)
const legacyPort=publicPort+1
process.env.PORT=String(legacyPort)
await import('./server.mjs')

const db=openTribunalDb()
const service=new TribunalService(db)
ensurePublicDocketSchema(db)

function json(res,status,payload){res.writeHead(status,{'content-type':'application/json','cache-control':'no-store','x-content-type-options':'nosniff'});res.end(JSON.stringify(payload))}
function html(res,status,payload){res.writeHead(status,{'content-type':'text/html; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff','referrer-policy':'no-referrer'});res.end(payload)}
async function body(req){const chunks=[];for await(const chunk of req){chunks.push(chunk);if(chunks.reduce((n,c)=>n+c.length,0)>65536)throw new Error('Request body too large.')}if(!chunks.length)return {};return JSON.parse(Buffer.concat(chunks).toString('utf8'))}
function match(path,pattern){const a=path.split('/').filter(Boolean),b=pattern.split('/').filter(Boolean);if(a.length!==b.length)return null;const out={};for(let i=0;i<b.length;i++){if(b[i].startsWith(':'))out[b[i].slice(1)]=decodeURIComponent(a[i]);else if(a[i]!==b[i])return null}return out}
const bearer=req=>String(req.headers.authorization||'').replace(/^Bearer\s+/i,'')

function proxy(req,res){const upstream=httpRequest({hostname:'127.0.0.1',port:legacyPort,path:req.url,method:req.method,headers:{...req.headers,host:`127.0.0.1:${legacyPort}`}},up=>{res.writeHead(up.statusCode||502,up.headers);up.pipe(res)});upstream.on('error',error=>json(res,502,{error:'Tribunal upstream unavailable.',detail:error.message}));req.pipe(upstream)}

const server=createServer(async(req,res)=>{const url=new URL(req.url,'http://localhost');try{
  if(req.method==='GET'&&url.pathname==='/health')return json(res,200,{ok:true,service:'neo-tribunal-backend',version:'1.13',schema:8,time:new Date().toISOString(),publicRecords:'neo-pacer-live',publicDocket:'live'})
  if(req.method==='GET'&&url.pathname==='/neo-pacer/docket')return html(res,200,neoPacerDocketHtml())
  const publicHandled=handlePublicDocketRoute({req,res,url,json,match,db,service:null,principal:null,body});if(publicHandled)return await publicHandled
  if(url.pathname.includes('/docket')){let principal=null;try{principal=service.principal(bearer(req))}catch(error){return json(res,401,{error:error.message})}const handled=handlePublicDocketRoute({req,res,url,json,match,db,service,principal,body});if(handled)return await handled}
  return proxy(req,res)
}catch(error){return json(res,400,{error:error instanceof Error?error.message:String(error)})}})
server.listen(publicPort,()=>console.log(JSON.stringify({level:'info',event:'server_started',service:'neo-tribunal-backend',version:'1.13',schema:8,publicDocket:'live',port:publicPort,legacyPort})))
