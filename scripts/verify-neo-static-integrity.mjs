import { readFile, readdir, stat, access } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dist = path.resolve(root, process.env.NEO_STATIC_DIST || 'dist');
const manifest = JSON.parse(await readFile(path.join(root,'architecture/neo-pages-routes.json'),'utf8'));
const errors = [];
const exists = async p => access(p).then(()=>true,()=>false);
const relative = p => path.relative(dist,p);
const safeTarget = p => p===dist || p.startsWith(dist+path.sep);

async function checkFile(target,label) {
  if(!safeTarget(target)) { errors.push('Path escape: '+label); return; }
  if(!await exists(target)) errors.push('Missing '+label);
}
await checkFile(path.join(dist,'index.html'),'root/index.html');
await checkFile(path.join(dist,'404.html'),'SPA 404 fallback');
for(const r of manifest.routes || []){
  const loc=String(r.path||'').replace(/^\/+|\/+$/g,'');
  if(!loc || loc.includes('..')) {errors.push('Unsafe route '+r.path);continue;}
  await checkFile(path.join(dist,loc,'index.html'),'route '+r.path);
}
for(const forbidden of ['neo-government','government-workspace','api/enterprise/memberships.json']){
  if(await exists(path.join(dist,forbidden)))errors.push('Private publication forbidden: '+forbidden);
}
for(const api of ['api/platforms/index.json','api/neo-telegram/status.json','api/enterprise/index.json']){
  await checkFile(path.join(dist,api),'API snapshot '+api);
}
async function files(folder) {
  const entries=await readdir(folder,{withFileTypes:true});
  const out=[];
  for(const e of entries){
    const p=path.join(folder,e.name);
    if(e.isDirectory())out.push(...await files(p));
    else if(e.isFile())out.push(p);
  }
  return out;
}
if(await exists(dist)){
  const all=await files(dist), html=all.filter(x=>x.endsWith('.html'));
  const re=/\b(?:href|src|action)\s*=\s*["']([^"']+)["']/gi;
  let inspected=0;
  for(const h of html){
    const content=await readFile(h,'utf8');
    for(const m of content.matchAll(re)){
      const ref=m[1].trim();
      if(!ref || ref[0]==='#' || /^(?:[a-z][a-z\d+.-]*:|\/\/|\{)/i.test(ref)) continue;
      const url=ref.split(/[?#]/,1)[0];if(!url)continue;
      let local=url;
      if(local.startsWith('/neo-system/')) local=local.slice('/neo-system'.length);
      const target=local.startsWith('/')?path.join(dist,local.replace(/^\//,'')):path.resolve(path.dirname(h),local);
      if(!safeTarget(target)){errors.push('Out of root '+relative(h)+': '+ref);continue;}
      inspected++;
      if(!await exists(target) && !await exists(path.join(target,'index.html'))) errors.push('Broken link '+relative(h)+': '+ref);
    }
  }
  console.log('NEO static integrity: '+html.length+' HTML documents, '+inspected+' local refs, '+(manifest.routes||[]).length+' canonical routes');
}
if(errors.length){for(const e of errors) console.error('FAIL '+e);process.exitCode=1;}else console.log('PASS static artifact integrity');
