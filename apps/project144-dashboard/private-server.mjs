import {createServer} from 'node:http';
import {readFile,stat} from 'node:fs/promises';
import {resolve,extname,sep} from 'node:path';
import {timingSafeEqual} from 'node:crypto';

export const repo='Shemsizedek/neo-system';
export const defaultPaths=['server/neo-counter-backend/server.mjs','apps/neoscan/server/server.mjs','server/neo-platform-api/giss-production.mjs','server/neo-enterprise/server.mjs','apps/neo-realty/src/server.ts','server/neo-platform-api/neopass-google-auth.mjs','server/miner-controller/controller.mjs','apps/neo-dash/server/server.mjs','server/neo-teller-backend/server.mjs','server/tribunal-backend/server.mjs'];
export function safeEqual(a,b){const aa=Buffer.from(a||'');const bb=Buffer.from(b||'');return aa.length===bb.length&&timingSafeEqual(aa,bb);}
export function authenticated(header,username,password){if(!username||!password)return false;if(!header?.startsWith('Basic '))return false;try{const credentials=Buffer.from(header.slice(6),'base64').toString('utf8');const i=credentials.indexOf(':');return i>=0&&safeEqual(credentials.slice(0,i),username)&&safeEqual(credentials.slice(i+1),password);}catch{return false;}}
export async function githubSnapshot(fetcher=fetch,token=process.env.GITHUB_TOKEN){
 const headers={'Accept':'application/vnd.github+json','User-Agent':'project144-command','X-GitHub-Api-Version':'2022-11-28'};
 if(token)headers.Authorization='Bearer '+token;
 const options={headers,signal:AbortSignal.timeout(9000)};
 const response=await fetcher('https://api.github.com/repos/'+repo,options);
 if(!response.ok)throw new Error('github_repo_http_'+response.status);
 const info=await response.json();
 const checks=await Promise.all(defaultPaths.map(async(path)=>{
  try{const r=await fetcher('https://api.github.com/repos/'+repo+'/contents/'+path+'?ref='+encodeURIComponent(info.default_branch||'main'),options);return {path,exists:r.ok,httpStatus:r.status};}
  catch{return {path,exists:false,httpStatus:null};}
 }));
 return {checkedAt:new Date().toISOString(),repository:repo,branch:info.default_branch,latestPush:info.pushed_at,openIssues:info.open_issues_count,paths:checks,source:'github-api',note:'File presence is not deployment verification'};
}
export function parseTargets(value){
 if(!value)return [];
 return value.split(',').map(x=>x.trim()).filter(Boolean).flatMap(entry=>{
 try{const u=new URL(entry);if(u.protocol!=='https:'||u.username||u.password||u.port||u.search||u.hash)return [];if(!/^([a-z0-9-]+\.)+[a-z]{2,}$/i.test(u.hostname))return [];return [{url:u.origin+u.pathname}];}catch{return [];}
 }).slice(0,25);
}
export async function healthSnapshot(targets,fetcher=fetch){
 return Promise.all(targets.map(async({url})=>{
  const start=Date.now();
  try{const r=await fetcher(url,{method:'GET',redirect:'manual',signal:AbortSignal.timeout(5000),headers:{'User-Agent':'project144-health-probe'}});return {url,status:r.status,healthy:r.status>=200&&r.status<400,latencyMs:Date.now()-start,checkedAt:new Date().toISOString()};}
  catch{return {url,status:null,healthy:false,latencyMs:Date.now()-start,checkedAt:new Date().toISOString()};}
 }));
}
export function createApp({username=process.env.COMMAND_USER,password=process.env.COMMAND_PASSWORD,fetcher=fetch,dist=resolve('dist-project144'),targets=parseTargets(process.env.HEALTH_TARGETS)}={}){
 let cached=null;let expiry=0;
 return createServer(async(req,res)=>{
  res.setHeader('Cache-Control','no-store');res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('X-Frame-Options','DENY');res.setHeader('Content-Security-Policy',"default-src 'self'; img-src 'self' data:; style-src 'self' 'unsafe-inline'; script-src 'self'; connect-src 'self'; base-uri 'none'; frame-ancestors 'none'");
  if(!username||!password){res.writeHead(503);res.end('Private dashboard credentials not configured');return;}
  if(!authenticated(req.headers.authorization,username,password)){res.setHeader('WWW-Authenticate','Basic realm="Project 144 Private"');res.writeHead(401);res.end('Authorization required');return;}
  const path=new URL(req.url||'/', 'http://localhost').pathname;
  if(path==='/api/status'){
   try{if(Date.now()>expiry){const [github,health]=await Promise.all([githubSnapshot(fetcher),healthSnapshot(targets,fetcher)]);cached={github,health};expiry=Date.now()+300000;}
    res.setHeader('Content-Type','application/json');res.end(JSON.stringify(cached));}
   catch(e){res.writeHead(502,{'Content-Type':'application/json'});res.end(JSON.stringify({error:'upstream_validation_unavailable',message:String(e.message)}));}return;
  }
  if(req.method!=='GET'&&req.method!=='HEAD'){res.writeHead(405);res.end();return;}
  let pathname=path==='/'?'/project144-dashboard.html':path;
  try{
   const candidate=resolve(dist,'.'+pathname);
   if(!(candidate===dist||candidate.startsWith(dist+sep)))throw Error('outside_dist');
   const f=await stat(candidate);if(!f.isFile())throw Error('not_file');
   const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml','.json':'application/json'}[extname(candidate)]||'application/octet-stream';
   res.setHeader('Content-Type',mime);res.end(req.method==='HEAD'?'':await readFile(candidate));
  }catch{res.writeHead(404);res.end('Not found');}
 });
}
if(process.argv[1]&&import.meta.url===new URL('file://'+resolve(process.argv[1])).href){createApp().listen(Number(process.env.PORT||10000),'0.0.0.0');}
