import { createRemoteJWKSet, jwtVerify } from 'jose';

const json=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store'}});
const clean=s=>String(s||'').trim();
const words=s=>clean(s).toLowerCase().split(/[^a-z0-9∞.-]+/).filter(Boolean);
const now=()=>new Date().toISOString();

async function authorize(request,env){
  if(!env.ACCESS_TEAM_DOMAIN||!env.ACCESS_AUD)return{ok:false,status:503,message:'NEOsync context recall access is not configured.'};
  const token=request.headers.get('CF-Access-Jwt-Assertion');
  if(!token)return{ok:false,status:401,message:'Authentication required.'};
  try{
    const issuer=`https://${env.ACCESS_TEAM_DOMAIN}`;
    const jwks=createRemoteJWKSet(new URL(`${issuer}/cdn-cgi/access/certs`));
    const{payload}=await jwtVerify(token,jwks,{issuer,audience:env.ACCESS_AUD});
    const email=String(payload.email||request.headers.get('Cf-Access-Authenticated-User-Email')||'').toLowerCase();
    const allow=String(env.ADMIN_EMAILS||'').split(',').map(x=>x.trim().toLowerCase()).filter(Boolean);
    if(allow.length&&!allow.includes(email))return{ok:false,status:403,message:'Executive authorization required.'};
    return{ok:true,email,payload};
  }catch{return{ok:false,status:401,message:'Invalid or expired access session.'}}
}

function memoryStub(env){const id=env.MEMORY_GRAPH.idFromName('neo-operational-memory');return env.MEMORY_GRAPH.get(id)}
async function memory(env,path,actor){const r=await memoryStub(env).fetch(new Request(`https://memory${path}`,{headers:{'x-neo-actor':actor}}));let b={};try{b=await r.json()}catch{}if(!r.ok)throw Object.assign(new Error(b.error||`Memory Graph ${r.status}`),{status:r.status});return b}

function scoreEntity(entity,qTokens){
  const name=String(entity.name||'').toLowerCase(), aliases=(entity.aliases||[]).join(' ').toLowerCase();
  const summary=String(entity.summary||'').toLowerCase(), meta=JSON.stringify(entity.metadata||{}).toLowerCase();
  let score=0;
  for(const t of qTokens){if(name===t)score+=10;if(name.includes(t))score+=6;if(aliases.includes(t))score+=4;if(summary.includes(t))score+=2;if(meta.includes(t))score+=1}
  if(['ACTIVE','OPEN','IN_PROGRESS','REVIEW','HOLD'].includes(entity.status))score+=1;
  const age=Math.max(0,Date.now()-Date.parse(entity.updatedAt||entity.createdAt||0));if(Number.isFinite(age)&&age<7*86400000)score+=2;else if(age<30*86400000)score+=1;
  return score;
}

function rankEdges(edges,ids){return edges.filter(e=>ids.has(e.from)||ids.has(e.to)).sort((a,b)=>Number(b.confidence||0)-Number(a.confidence||0)).slice(0,80)}
function summarize(entity,edgeCount){const status=entity.status?` [${entity.status}]`:'';const detail=entity.summary?` — ${entity.summary}`:'';return `${entity.name}${status}${detail}${edgeCount?` (${edgeCount} linked relationship${edgeCount===1?'':'s'})`:''}`}

async function recall(env,actor,query){
  const q=clean(query);if(!q)throw Object.assign(new Error('Query is required.'),{status:400});
  const direct=await memory(env,`/search?q=${encodeURIComponent(q)}`,actor);
  const candidates=direct.results||[], tokens=words(q);
  const ranked=candidates.map(e=>({...e,_score:scoreEntity(e,tokens)})).sort((a,b)=>b._score-a._score||String(b.updatedAt||'').localeCompare(String(a.updatedAt||''))).slice(0,8);
  const contexts=[];
  for(const e of ranked.slice(0,4)){try{contexts.push(await memory(env,`/graph/${encodeURIComponent(e.id)}?depth=2`,actor))}catch{}}
  const allEntities=new Map(), allEdges=new Map();
  for(const c of contexts){for(const e of c.entities||[])allEntities.set(e.id,e);for(const edge of c.edges||[])allEdges.set(edge.id,edge)}
  for(const e of ranked)allEntities.set(e.id,e);
  const ids=new Set(allEntities.keys()), edges=rankEdges([...allEdges.values()],ids);
  const relationshipCounts={};for(const e of edges){relationshipCounts[e.from]=(relationshipCounts[e.from]||0)+1;relationshipCounts[e.to]=(relationshipCounts[e.to]||0)+1}
  const focus=ranked.map(e=>({...e,relationshipCount:relationshipCounts[e.id]||0}));
  const related=[...allEntities.values()].filter(e=>!focus.some(f=>f.id===e.id)).slice(0,20);
  const answer=focus.length?`Recall for “${q}”: ${focus.slice(0,5).map(e=>summarize(e,e.relationshipCount)).join(' | ')}`:`No structured operational memory matched “${q}”.`;
  return{ok:true,query:q,generatedAt:now(),answer,focus,related,relationships:edges,provenance:{source:'NEOsync Operational Memory Graph',mode:'lexical+graph+recency',authoritativeSourcesRemainExternal:true}};
}

function page(email){return`<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>NEOsync Context Recall</title><style>body{margin:0;background:#040706;color:#eaffef;font-family:system-ui}.wrap{max-width:980px;margin:0 auto;padding:32px}.card{border:1px solid #284231;background:#0b120e;border-radius:18px;padding:20px;margin:14px 0}input{width:100%;padding:14px;border-radius:12px;border:1px solid #355c43;background:#07100a;color:#fff}button{margin-top:10px;padding:12px 18px;border:0;border-radius:12px;background:#75ff98;color:#041007;font-weight:700}.muted{color:#95aa9b}pre{white-space:pre-wrap}.pill{display:inline-block;border:1px solid #34513d;border-radius:999px;padding:3px 8px;margin:2px}</style></head><body><div class="wrap"><h1>NEOsync Context Recall</h1><div class="muted">Authenticated executive: ${email}</div><div class="card"><input id="q" placeholder="Where did we leave off with Treasury?"><button onclick="go()">Recall</button></div><div id="out" class="card">Ask about any organization, module, project, case, task, decision, policy, document, system, office, or event stored in operational memory.</div></div><script>async function go(){const q=document.getElementById('q').value.trim();if(!q)return;const out=document.getElementById('out');out.textContent='Retrieving connected context…';const r=await fetch('/api/recall?q='+encodeURIComponent(q));const d=await r.json();if(!r.ok){out.textContent=d.error||'Recall failed';return}out.innerHTML='<h3>'+esc(d.answer)+'</h3>'+(d.focus||[]).map(x=>'<div><span class="pill">'+esc(x.type)+'</span> <b>'+esc(x.name)+'</b> <span class="muted">'+esc(x.status||'')+'</span><div>'+esc(x.summary||'')+'</div></div>').join('<hr>')+'<p class="muted">Relationships returned: '+(d.relationships||[]).length+'</p>'}function esc(s){return String(s||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}</script></body></html>`}

export default{async fetch(request,env){
  const u=new URL(request.url);
  if(u.pathname==='/health')return json({ok:true,service:'neo-context-recall',version:'1.0',capabilities:['semantic-recall','graph-expansion','continuity-context','provenance-aware-retrieval'],memoryBinding:!!env.MEMORY_GRAPH});
  const a=await authorize(request,env);if(!a.ok)return json({ok:false,error:a.message},a.status);
  try{
    if(request.method==='GET'&&u.pathname==='/api/recall')return json(await recall(env,a.email,u.searchParams.get('q')||''));
    if(request.method==='GET'&&u.pathname==='/api/context')return new Response((await memory(env,`/context${u.search}`,a.email))&&JSON.stringify(await memory(env,`/context${u.search}`,a.email)),{headers:{'content-type':'application/json','cache-control':'no-store'}});
    const gm=u.pathname.match(/^\/api\/graph\/(.+)$/);if(request.method==='GET'&&gm)return json(await memory(env,`/graph/${encodeURIComponent(decodeURIComponent(gm[1]))}?depth=${encodeURIComponent(u.searchParams.get('depth')||2)}`,a.email));
    if(u.pathname==='/'||u.pathname==='/recall')return new Response(page(a.email),{headers:{'content-type':'text/html; charset=utf-8','cache-control':'no-store','x-robots-tag':'noindex,nofollow'}});
    return json({error:'Not found'},404);
  }catch(e){return json({error:e.message},e.status||500)}
}};
