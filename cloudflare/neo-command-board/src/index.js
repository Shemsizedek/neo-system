import { createRemoteJWKSet, jwtVerify } from 'jose';

const json=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store'}});
const esc=s=>String(s||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const now=()=>new Date().toISOString();
const MODULE_LINKS={executive:'/neosync',tribunal:'/command#tribunal',chaplaincy:'/command#chaplaincy',treasury:'/command#treasury',router:'/command#router',police:'/command#police',marshals:'/command#marshals',guards:'/command#guards',defense:'/command#defense','global-arms':'/command#global-arms',cipher:'/command#cipher',enterprise:'/command#enterprise'};

async function authorize(request,env){
  if(!env.ACCESS_TEAM_DOMAIN||!env.ACCESS_AUD)return{ok:false,status:503,message:'NEOsync Command Board access is not configured.'};
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

function serviceHeaders(env,actor){
  const h={accept:'application/json','content-type':'application/json','x-neo-actor':actor};
  if(env.MODULE_ADAPTER_TOKEN)h.authorization=`Bearer ${env.MODULE_ADAPTER_TOKEN}`;
  if(env.CF_ACCESS_CLIENT_ID)h['CF-Access-Client-Id']=env.CF_ACCESS_CLIENT_ID;
  if(env.CF_ACCESS_CLIENT_SECRET)h['CF-Access-Client-Secret']=env.CF_ACCESS_CLIENT_SECRET;
  return h;
}

async function serviceJson(url,env,actor,init={}){
  const r=await fetch(url,{method:init.method||'GET',headers:{...serviceHeaders(env,actor),...(init.headers||{})},body:init.body?JSON.stringify(init.body):undefined,signal:AbortSignal.timeout(init.timeout||12000)});
  let b={};try{b=await r.json()}catch{}
  if(!r.ok)throw Object.assign(new Error(b.error||`${new URL(url).hostname} returned ${r.status}`),{status:r.status});
  return b;
}

async function getContext(env,actor){
  const out={inbox:null,government:null,errors:[]};
  if(env.EXECUTIVE_INBOX_URL){try{out.inbox=await serviceJson(String(env.EXECUTIVE_INBOX_URL).replace(/\/+$/,'')+'/api/inbox',env,actor)}catch(e){out.errors.push(`Inbox: ${e.message}`)}}
  if(env.GOVERNMENT_API_URL){try{out.government=await serviceJson(String(env.GOVERNMENT_API_URL).replace(/\/+$/,'')+'/api/adapters',env,actor)}catch(e){out.errors.push(`Government: ${e.message}`)}}
  return out;
}

function contextSummary(ctx){
  const c=ctx.inbox?.counts||{};
  const active=(ctx.inbox?.items||[]).filter(x=>x.disposition?.status!=='RESOLVED');
  const top=active.slice(0,8).map(x=>({id:x.id,priority:x.priority,title:x.title,source:x.source,module:x.module,dueAt:x.dueAt||null}));
  const adapters=(ctx.government?.adapters||[]).map(a=>({id:a.id,name:a.name,state:a.state,mode:a.mode}));
  return{counts:c,top,adapters,errors:ctx.errors||[]};
}

function executiveBrief(ctx,tasks=[]){
  const s=contextSummary(ctx),open=Number(s.counts.open||0),critical=Number(s.counts.critical||0),high=Number(s.counts.high||0),due=tasks.filter(t=>t.status!=='DONE'&&t.dueAt&&Date.parse(t.dueAt)<Date.now()+86400000);
  const attention=s.top.slice(0,5).map((x,i)=>`${i+1}. ${x.priority} — ${x.title}`).join(' ');
  const unhealthy=s.adapters.filter(a=>!['LIVE','REPOSITORY'].includes(a.state)).map(a=>`${a.name}: ${a.state}`).join(', ');
  return `Executive brief: ${open} open attention item(s), ${critical} critical, ${high} high priority, and ${due.length} command-board task(s) due within 24 hours. ${attention?`Top queue: ${attention}.`: 'No active inbox items were returned.'}${unhealthy?` Service attention: ${unhealthy}.`:''}`;
}

export class CommandStore{
  constructor(state){this.storage=state.storage}
  async messages(){return[...(await this.storage.list({prefix:'msg:'})).values()].sort((a,b)=>a.createdAt.localeCompare(b.createdAt)).slice(-80)}
  async tasks(){return[...(await this.storage.list({prefix:'task:'})).values()].sort((a,b)=>String(a.createdAt).localeCompare(String(b.createdAt))).reverse()}
  async proposals(){return[...(await this.storage.list({prefix:'proposal:'})).values()].sort((a,b)=>String(b.createdAt).localeCompare(String(a.createdAt))).slice(0,50)}
  async audit(){return[...(await this.storage.list({prefix:'audit:'})).values()].sort((a,b)=>String(b.createdAt).localeCompare(String(a.createdAt))).slice(0,100)}
  async putMessage(role,content,actor,meta={}){const row={id:crypto.randomUUID(),role,content:String(content).slice(0,12000),actor,meta,createdAt:now()};await this.storage.put(`msg:${Date.now()}:${row.id}`,row);return row}
  async createTask(b,actor){const row={id:crypto.randomUUID(),title:String(b.title||'').trim().slice(0,240),description:String(b.description||'').slice(0,5000),assignee:String(b.assignee||actor).slice(0,240),office:String(b.office||'Executive Office').slice(0,160),dueAt:b.dueAt||null,linkedSource:b.linkedSource||null,status:'OPEN',createdAt:now(),createdBy:actor,updatedAt:now()};if(!row.title)throw Object.assign(new Error('Task title required.'),{status:400});await this.storage.put(`task:${row.id}`,row);await this.log(actor,'TASK_CREATE',row.id,row.title);return row}
  async updateTask(id,b,actor){const key=`task:${id}`,row=await this.storage.get(key);if(!row)throw Object.assign(new Error('Task not found.'),{status:404});const allowed=new Set(['OPEN','IN_PROGRESS','BLOCKED','DONE']);if(b.status&&!allowed.has(b.status))throw Object.assign(new Error('Invalid task status.'),{status:400});Object.assign(row,{status:b.status||row.status,assignee:b.assignee??row.assignee,office:b.office??row.office,dueAt:b.dueAt??row.dueAt,description:b.description??row.description,updatedAt:now(),updatedBy:actor});await this.storage.put(key,row);await this.log(actor,'TASK_UPDATE',id,row.status);return row}
  async createProposal(b,actor){const row={id:crypto.randomUUID(),type:b.type,target:b.target||null,payload:b.payload||{},impact:String(b.impact||'State change').slice(0,1000),status:'PENDING_CONFIRMATION',createdAt:now(),createdBy:actor,expiresAt:new Date(Date.now()+15*60*1000).toISOString()};await this.storage.put(`proposal:${row.id}`,row);await this.log(actor,'PROPOSAL_CREATE',row.id,row.type);return row}
  async proposal(id){return this.storage.get(`proposal:${id}`)}
  async setProposal(id,status,actor,result=null){const key=`proposal:${id}`,row=await this.storage.get(key);if(!row)throw Object.assign(new Error('Proposal not found.'),{status:404});row.status=status;row.updatedAt=now();row.updatedBy=actor;if(result)row.result=result;await this.storage.put(key,row);await this.log(actor,`PROPOSAL_${status}`,id,row.type);return row}
  async log(actor,action,target,note=''){const row={id:crypto.randomUUID(),actor,action,target,note:String(note).slice(0,3000),createdAt:now()};await this.storage.put(`audit:${Date.now()}:${row.id}`,row);return row}
  async snapshot(){return{messages:await this.messages(),tasks:await this.tasks(),proposals:await this.proposals(),audit:await this.audit()}}
  async fetch(request){
    const u=new URL(request.url),actor=request.headers.get('x-neo-actor')||'unknown';
    try{
      if(request.method==='GET'&&u.pathname==='/snapshot')return json(await this.snapshot());
      if(request.method==='POST'&&u.pathname==='/messages'){const b=await request.json();return json({ok:true,message:await this.putMessage(b.role||'user',b.content||'',actor,b.meta||{})},201)}
      if(request.method==='POST'&&u.pathname==='/tasks'){return json({ok:true,task:await this.createTask(await request.json(),actor)},201)}
      const tm=u.pathname.match(/^\/tasks\/([^/]+)$/);if(request.method==='POST'&&tm)return json({ok:true,task:await this.updateTask(tm[1],await request.json(),actor)});
      if(request.method==='POST'&&u.pathname==='/proposals'){return json({ok:true,proposal:await this.createProposal(await request.json(),actor)},201)}
      const pm=u.pathname.match(/^\/proposals\/([^/]+)$/);if(request.method==='GET'&&pm){const p=await this.proposal(pm[1]);return p?json({ok:true,proposal:p}):json({error:'Proposal not found.'},404)}
      const ps=u.pathname.match(/^\/proposals\/([^/]+)\/status$/);if(request.method==='POST'&&ps){const b=await request.json();return json({ok:true,proposal:await this.setProposal(ps[1],b.status,actor,b.result)})}
      return json({error:'Command store route not found'},404);
    }catch(e){return json({error:e.message},e.status||400)}
  }
}

function storeStub(env,actor){const id=env.COMMAND_STORE.idFromName(actor),stub=env.COMMAND_STORE.get(id);return{async call(path,init={}){const r=await stub.fetch(new Request(`https://command-store${path}`,{method:init.method||'GET',headers:{'content-type':'application/json','x-neo-actor':actor},body:init.body?JSON.stringify(init.body):undefined}));let b={};try{b=await r.json()}catch{}if(!r.ok)throw Object.assign(new Error(b.error||`Store ${r.status}`),{status:r.status});return b}}}

async function proposeFromMessage(message,ctx,store){
  const q=message.toLowerCase();
  const active=(ctx.inbox?.items||[]).filter(x=>x.disposition?.status!=='RESOLVED');
  const ack=q.match(/acknowledge(?: the)? top (\d+)/);
  if(ack){const n=Math.max(1,Math.min(10,Number(ack[1]))),targets=active.slice(0,n).map(x=>x.id);if(!targets.length)return null;return(await store.call('/proposals',{method:'POST',body:{type:'INBOX_ACKNOWLEDGE',target:targets,payload:{status:'ACKNOWLEDGED'},impact:`Acknowledge ${targets.length} executive inbox item(s). Source records are not resolved or mutated.`}})).proposal}
  const sm=q.match(/(?:put|set) (treasury|tribunal|router|chaplaincy|police|marshals|guards|defense|global arms|cipher) (?:in|to) (review|hold|active|ready)/);
  if(sm){const id=sm[1].replace('global arms','global-arms'),status=sm[2].toUpperCase();return(await store.call('/proposals',{method:'POST',body:{type:'MODULE_STATUS',target:id,payload:{status},impact:`Change Government module ${id} status to ${status}. This changes command-console state only; it does not execute the module's substantive powers.`}})).proposal}
  return null;
}

function localIntent(message,ctx,snap){
  const q=message.toLowerCase();
  if(/brief|what.*need|morning report|daily report/.test(q))return{reply:executiveBrief(ctx,snap.tasks)};
  if(/task|assignment/.test(q)&&/show|list|what/.test(q)){const rows=snap.tasks.filter(t=>t.status!=='DONE').slice(0,10);return{reply:rows.length?`Open Command Board tasks: ${rows.map((t,i)=>`${i+1}. ${t.title} — ${t.status} — ${t.assignee}${t.dueAt?` — due ${t.dueAt}`:''}`).join(' ')}`:'There are no open Command Board tasks.'}}
  if(/critical|urgent|escalat/.test(q)){const rows=(ctx.inbox?.items||[]).filter(x=>['CRITICAL','HIGH'].includes(x.priority)&&x.disposition?.status!=='RESOLVED');return{reply:rows.length?`Priority queue: ${rows.slice(0,10).map((x,i)=>`${i+1}. ${x.priority}: ${x.title}`).join(' ')}`:'No unresolved critical or high-priority inbox items were returned.'}}
  if(/health|online|offline|adapter|service/.test(q)){const rows=ctx.government?.adapters||[];return{reply:rows.length?`Service fabric: ${rows.map(x=>`${x.name} is ${x.state}`).join('; ')}.`:'Government adapter state is not available.'}}
  const open=q.match(/open (?:the )?(treasury|tribunal|router|chaplaincy|police|marshals|guards|defense|global arms|cipher|enterprise)/);if(open){const id=open[1].replace('global arms','global-arms');return{reply:`Opening ${open[1]}.`,navigate:MODULE_LINKS[id]||'/command'} }
  return{reply:'I can brief you, inspect priorities and service health, remember this conversation, manage executive tasks, navigate modules, and prepare confirmation-gated commands. Try: “Give me my executive brief,” “show my tasks,” “open Treasury,” “acknowledge the top 3,” or “put Treasury in review.”'};
}

async function executeProposal(p,env,actor){
  if(Date.parse(p.expiresAt)<Date.now())throw Object.assign(new Error('Proposal expired. Ask NEOsync to prepare it again.'),{status:409});
  if(p.type==='INBOX_ACKNOWLEDGE'){
    if(!env.EXECUTIVE_INBOX_URL)throw Object.assign(new Error('Executive Inbox service is not configured.'),{status:503});
    const base=String(env.EXECUTIVE_INBOX_URL).replace(/\/+$/,'');const results=[];
    for(const id of p.target||[]){results.push(await serviceJson(`${base}/api/items/${encodeURIComponent(id)}`,env,actor,{method:'POST',body:{status:'ACKNOWLEDGED',note:`Confirmed through NEOsync Command Board proposal ${p.id}`}}))}
    return{ok:true,type:p.type,count:results.length};
  }
  if(p.type==='MODULE_STATUS'){
    if(!env.GOVERNMENT_API_URL)throw Object.assign(new Error('Government API is not configured.'),{status:503});
    const base=String(env.GOVERNMENT_API_URL).replace(/\/+$/,'');return serviceJson(`${base}/api/modules/${encodeURIComponent(p.target)}/status`,env,actor,{method:'POST',body:{status:p.payload.status}});
  }
  throw Object.assign(new Error('Unsupported proposal type.'),{status:400});
}

function page(email){return`<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>NEOsync Command Board</title><style>:root{--b:#030608;--p:#0c1210;--l:#233329;--g:#6cff91;--gold:#d8b45e;--t:#edfff2;--m:#8ca095;--r:#ff7d7d}*{box-sizing:border-box}body{margin:0;background:radial-gradient(circle at 50% -10%,#0a2818,#030608 45%);color:var(--t);font-family:system-ui}.app{max-width:1220px;margin:auto;min-height:100vh;padding:18px}.head{display:flex;justify-content:space-between;align-items:center}.brand{display:flex;gap:12px;align-items:center}.orb{width:52px;height:52px;border-radius:50%;display:grid;place-items:center;background:radial-gradient(circle,#e0ffe7,var(--g),#087d3d);color:#001b08;font-size:24px;font-weight:900;box-shadow:0 0 30px #55ff8455}.ey{font-size:10px;letter-spacing:.14em;color:var(--gold)}.auth{font-size:10px;color:var(--g);text-align:right}.layout{display:grid;grid-template-columns:1.8fr .9fr;gap:12px;margin-top:14px}.panel{border:1px solid var(--l);background:#07100b;border-radius:20px;padding:14px}.chat{height:58vh;overflow:auto;padding:4px}.msg{max-width:82%;padding:12px 14px;border-radius:17px;margin:8px 0;white-space:pre-wrap;line-height:1.45}.user{margin-left:auto;background:#173421}.bot{background:#101713;border:1px solid var(--l)}.composer{display:flex;gap:7px;margin-top:10px}textarea,input,select{width:100%;background:#040906;color:white;border:1px solid #31563d;border-radius:12px;padding:11px}textarea{min-height:52px;resize:none}button{border:0;border-radius:12px;background:var(--g);color:#001708;font-weight:900;padding:10px 14px}.secondary{background:#122019;color:#dcffe5;border:1px solid #31563d}.danger{background:#3b1919;color:#ffdede}.chips{display:flex;gap:6px;flex-wrap:wrap;margin-bottom:8px}.chip{font-size:11px;padding:7px 9px}.list{display:grid;gap:8px;max-height:52vh;overflow:auto}.item{border:1px solid #22342a;border-radius:12px;padding:10px;background:#0a110d}.meta{font-size:10px;color:var(--m)}.proposal{border-color:var(--gold)}.proposal b{color:var(--gold)}.row{display:flex;gap:7px}.row>*{flex:1}.mic{min-width:48px;background:#15231b;color:#e5ffeb;border:1px solid #31563d}@media(max-width:760px){.layout{grid-template-columns:1fr}.auth{display:none}.chat{height:48vh}}</style></head><body><main class="app"><header class="head"><div class="brand"><div class="orb">∞</div><div><div class="ey">PRIVATE GOVERNMENT AI · COMMAND BOARD</div><strong>NEOsync</strong><div class="meta">Persistent conversational executive control</div></div></div><div class="auth">● AUTHENTICATED<br>${esc(email)}</div></header><div class="layout"><section class="panel"><div class="chips"><button class="chip secondary" onclick="quick('Give me my executive brief')">Brief</button><button class="chip secondary" onclick="quick('Show my tasks')">Tasks</button><button class="chip secondary" onclick="quick('Show critical and escalated items')">Critical</button><button class="chip secondary" onclick="quick('Give me system health')">Health</button></div><div id="chat" class="chat"></div><div class="composer"><button id="mic" class="mic">🎙</button><textarea id="q" placeholder="Talk to NEOsync…"></textarea><button id="send">↑</button></div></section><aside class="panel"><h3>Executive Tasks</h3><div class="row"><input id="taskTitle" placeholder="New task"><button onclick="createTask()">Add</button></div><div id="tasks" class="list" style="margin-top:10px"></div><h3>Pending Confirmation</h3><div id="proposals" class="list"></div></aside></div></main><script>let STATE={messages:[],tasks:[],proposals:[]};const e=s=>String(s||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));async function api(p,i){const r=await fetch(p,{...i,headers:{'content-type':'application/json',...(i&&i.headers||{})}}),j=await r.json();if(!r.ok)throw Error(j.error||'Request failed');return j}function add(role,text){const d=document.createElement('div');d.className='msg '+(role==='user'?'user':'bot');d.textContent=text;chat.appendChild(d);chat.scrollTop=chat.scrollHeight;return d}function render(){chat.innerHTML='';if(!STATE.messages.length)add('assistant','NEOsync Command Board online. I remember this executive thread and can brief, route, assign, and prepare confirmation-gated commands.');else STATE.messages.forEach(m=>add(m.role==='user'?'user':'assistant',m.content));tasks.innerHTML=STATE.tasks.map(t=>'<div class="item"><b>'+e(t.title)+'</b><div class="meta">'+e(t.status)+' · '+e(t.assignee)+(t.dueAt?' · '+new Date(t.dueAt).toLocaleString():'')+'</div><button class="secondary" onclick="taskDone(\''+t.id+'\')">Done</button></div>').join('')||'<div class="meta">No tasks.</div>';proposals.innerHTML=STATE.proposals.filter(p=>p.status==='PENDING_CONFIRMATION').map(p=>'<div class="item proposal"><b>CONFIRMATION REQUIRED</b><div>'+e(p.impact)+'</div><div class="meta">Expires '+new Date(p.expiresAt).toLocaleTimeString()+'</div><button onclick="confirmProposal(\''+p.id+'\')">Confirm</button><button class="danger" onclick="rejectProposal(\''+p.id+'\')">Reject</button></div>').join('')||'<div class="meta">No pending commands.</div>'}async function refresh(){STATE=(await api('/api/state')).state;render()}async function send(){const m=q.value.trim();if(!m)return;q.value='';add('user',m);const wait=add('assistant','Thinking…');try{const j=await api('/api/chat',{method:'POST',body:JSON.stringify({message:m})});wait.textContent=j.reply;if(j.navigate)setTimeout(()=>location.href=j.navigate,500);await refresh();if(document.body.dataset.voice==='on')speak(j.reply)}catch(err){wait.textContent='NEOsync error: '+err.message}}function quick(x){q.value=x;send()}async function createTask(){const title=taskTitle.value.trim();if(!title)return;await api('/api/tasks',{method:'POST',body:JSON.stringify({title})});taskTitle.value='';await refresh()}async function taskDone(id){await api('/api/tasks/'+id,{method:'POST',body:JSON.stringify({status:'DONE'})});refresh()}async function confirmProposal(id){if(!confirm('Confirm this NEOsync command?'))return;const j=await api('/api/proposals/'+id+'/confirm',{method:'POST',body:'{}'});add('assistant','Confirmed. '+(j.summary||'Command executed.'));refresh()}async function rejectProposal(id){await api('/api/proposals/'+id+'/reject',{method:'POST',body:'{}'});refresh()}send.onclick=send;q.onkeydown=ev=>{if(ev.key==='Enter'&&!ev.shiftKey){ev.preventDefault();send()}};function speak(t){if(!('speechSynthesis'in window))return;speechSynthesis.cancel();const u=new SpeechSynthesisUtterance(t);u.rate=.96;u.pitch=.92;speechSynthesis.speak(u)}const SR=window.SpeechRecognition||window.webkitSpeechRecognition;if(SR){const r=new SR();r.lang='en-US';r.onstart=()=>mic.textContent='●';r.onend=()=>mic.textContent='🎙';r.onresult=ev=>{q.value=ev.results[0][0].transcript;document.body.dataset.voice='on';send()};mic.onclick=()=>r.start()}else mic.onclick=()=>alert('Speech recognition is unavailable in this browser.');refresh();</script></body></html>`}

export default{async fetch(request,env){
  const u=new URL(request.url);if(u.pathname==='/health')return json({ok:true,service:'neo-command-board',version:'2.0',persistentMemory:true,voice:true,confirmationProtocol:true});
  const a=await authorize(request,env);if(!a.ok)return json({ok:false,error:a.message},a.status);const store=storeStub(env,a.email);
  try{
    if(request.method==='GET'&&u.pathname==='/api/state')return json({ok:true,state:(await store.call('/snapshot')).messages!==undefined?await store.call('/snapshot'):{} });
    if(request.method==='POST'&&u.pathname==='/api/tasks')return json(await store.call('/tasks',{method:'POST',body:await request.json()}),201);
    const tm=u.pathname.match(/^\/api\/tasks\/([^/]+)$/);if(request.method==='POST'&&tm)return json(await store.call(`/tasks/${tm[1]}`,{method:'POST',body:await request.json()}));
    if(request.method==='POST'&&u.pathname==='/api/chat'){
      const b=await request.json(),message=String(b.message||'').trim().slice(0,8000);if(!message)return json({error:'Message required.'},400);
      await store.call('/messages',{method:'POST',body:{role:'user',content:message}});const ctx=await getContext(env,a.email);let snap=(await store.call('/snapshot'));
      const proposal=await proposeFromMessage(message,ctx,store);if(proposal){const reply=`I prepared a command for confirmation: ${proposal.impact} Review the confirmation card before execution.`;await store.call('/messages',{method:'POST',body:{role:'assistant',content:reply,meta:{proposalId:proposal.id}}});return json({ok:true,reply,proposal});}
      let result=localIntent(message,ctx,snap),mode='local';
      if(env.NEOSYNC_CHAT_URL){try{const r=await fetch(env.NEOSYNC_CHAT_URL,{method:'POST',headers:{'content-type':'application/json',...(env.NEOSYNC_CHAT_TOKEN?{authorization:`Bearer ${env.NEOSYNC_CHAT_TOKEN}`}:{})},body:JSON.stringify({message,history:snap.messages.slice(-20),context:contextSummary(ctx),tasks:snap.tasks.slice(0,20),surface:'neo-government-command-board',rules:{stateChangesRequireConfirmation:true}}),signal:AbortSignal.timeout(30000)});if(r.ok){const z=await r.json(),reply=String(z.reply||z.message||z.output||'').trim();if(reply){result={reply};mode='ai'}}}catch{}}
      await store.call('/messages',{method:'POST',body:{role:'assistant',content:result.reply,meta:{mode}}});return json({ok:true,...result,mode});
    }
    const pc=u.pathname.match(/^\/api\/proposals\/([^/]+)\/confirm$/);if(request.method==='POST'&&pc){const p=(await store.call(`/proposals/${pc[1]}`)).proposal;if(p.status!=='PENDING_CONFIRMATION')return json({error:`Proposal is ${p.status}.`},409);const result=await executeProposal(p,env,a.email);await store.call(`/proposals/${p.id}/status`,{method:'POST',body:{status:'CONFIRMED',result}});const summary=`${p.type} completed under explicit executive confirmation.`;await store.call('/messages',{method:'POST',body:{role:'assistant',content:summary,meta:{proposalId:p.id,confirmed:true}}});return json({ok:true,result,summary});}
    const pr=u.pathname.match(/^\/api\/proposals\/([^/]+)\/reject$/);if(request.method==='POST'&&pr){await store.call(`/proposals/${pr[1]}/status`,{method:'POST',body:{status:'REJECTED'}});return json({ok:true});}
    if(u.pathname==='/'||u.pathname==='/chat'||u.pathname==='/command-board')return new Response(page(a.email),{headers:{'content-type':'text/html; charset=utf-8','cache-control':'no-store','x-robots-tag':'noindex, nofollow','content-security-policy':"default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'"}});
    return json({error:'Not found'},404);
  }catch(e){return json({error:String(e.message||e)},e.status||500)}
}};
