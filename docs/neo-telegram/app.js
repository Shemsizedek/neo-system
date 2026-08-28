const STORAGE_KEY='neo.telegram.v0.2.state';
const defaultTransports=['INTERNET','MESH','SMS','RADIO'];
const state=loadState();
const health=document.querySelector('#health');
const backend=document.querySelector('#backend');
const typeSelect=document.querySelector('#type');
const transportSelect=document.querySelector('#transport');
const destinationInput=document.querySelector('#dest');
let directory=[];
let routes=[];

function loadState(){
  try{
    const saved=JSON.parse(localStorage.getItem(STORAGE_KEY)||'null');
    return saved&&typeof saved==='object'?{outbox:saved.outbox||[],inbox:saved.inbox||[]}:{outbox:[],inbox:[]};
  }catch{return {outbox:[],inbox:[]};}
}
function persist(){localStorage.setItem(STORAGE_KEY,JSON.stringify(state));}
function escapeHtml(value){return String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));}
function renderHealth(transports=defaultTransports){
  health.innerHTML=transports.map(t=>{
    const route=routes.find(r=>r.transport===t);
    const label=route?.state||'READY';
    const cls=label==='READY'?'ok':'warn';
    return `<div class="health"><span>${escapeHtml(t)}</span><b class="${cls}">${escapeHtml(label)}</b></div>`;
  }).join('');
}
function renderMailbox(){
  const outbox=document.querySelector('#outbox');
  const inbox=document.querySelector('#inbox');
  outbox.innerHTML=state.outbox.length?state.outbox.map(x=>`<div class="entry"><div><b>${escapeHtml(x.message_id)}</b><br><small>${escapeHtml(x.created_at)}</small></div><div><b>${escapeHtml(x.message.type)}</b><br><small>${escapeHtml(x.source.neo_id)} → ${escapeHtml(x.destination.value)}</small></div><div>${escapeHtml(x.routing.transport_preference[0])}</div><div class="ok">${escapeHtml(x.delivery_state)}</div></div>`).join(''):'<p>No queued telegrams.</p>';
  inbox.innerHTML=state.inbox.length?state.inbox.map(x=>`<div class="entry"><div><b>${escapeHtml(x.message_id)}</b><br><small>${escapeHtml(x.received_at||x.created_at)}</small></div><div><b>${escapeHtml(x.message.type)}</b><br><small>${escapeHtml(x.source.neo_id)} → ${escapeHtml(x.destination.value)}</small></div><div>${escapeHtml(x.routing.transport_preference[0])}</div><div class="ok">DELIVERED</div></div>`).join(''):'<p>No received telegrams.</p>';
  document.querySelector('#outboxCount').textContent=state.outbox.length;
  document.querySelector('#inboxCount').textContent=state.inbox.length;
}
function envelope(){
  const now=new Date();
  return {
    protocol:'NTP',version:'1.0',message_id:'ntp:'+crypto.randomUUID(),
    created_at:now.toISOString(),expires_at:new Date(now.getTime()+86400000).toISOString(),
    source:{neo_id:'NEO-00000144',device_id:'github-pages-v0.2'},
    destination:{type:'neo_id',value:destinationInput.value.trim()},
    message:{type:typeSelect.value,priority:'NORMAL',content_type:'text/plain',encoding:'utf-8',payload:document.querySelector('#payload').value},
    routing:{mode:'AUTO',hop_limit:12,store_forward:true,transport_preference:[transportSelect.value]},
    security:{encryption:'REQUIRED',signature_algorithm:'Ed25519',signature:null,state:'UNSIGNED_DEMO'},
    ack:{requested:true},delivery_state:'QUEUED'
  };
}
function resolveDestination(value){return directory.find(x=>x.neo_id===value)||null;}
async function loadBackend(){
  renderHealth();
  try{
    const [statusRes,protocolRes,identitiesRes,routesRes]=await Promise.all([
      fetch('../api/neo-telegram/status.json',{cache:'no-store'}),
      fetch('../api/neo-telegram/protocol.json',{cache:'no-store'}),
      fetch('../api/neo-telegram/identities.json',{cache:'no-store'}),
      fetch('../api/neo-telegram/routes.json',{cache:'no-store'})
    ]);
    if(!statusRes.ok||!protocolRes.ok||!identitiesRes.ok||!routesRes.ok)throw new Error('snapshot unavailable');
    const status=await statusRes.json();
    const protocol=await protocolRes.json();
    const identities=await identitiesRes.json();
    const routeRegistry=await routesRes.json();
    directory=Array.isArray(identities.directory)?identities.directory:[];
    routes=Array.isArray(routeRegistry.routes)?routeRegistry.routes:[];
    backend.textContent='GitHub registry connected';backend.className='ok';
    if(Array.isArray(status.transports))transportSelect.innerHTML=['AUTO',...status.transports].map(t=>`<option>${escapeHtml(t)}</option>`).join('');
    if(Array.isArray(protocol.message_types))typeSelect.innerHTML=protocol.message_types.map(t=>`<option>${escapeHtml(t)}</option>`).join('');
    renderHealth(status.transports||defaultTransports);
    document.querySelector('#directory').innerHTML=directory.map(x=>`<div class="health"><span>${escapeHtml(x.neo_id)} · ${escapeHtml(x.display_name)}</span><b class="${x.status==='ACTIVE'?'ok':'warn'}">${escapeHtml(x.status)}</b></div>`).join('')||'<p>No identities published.</p>';
  }catch{
    backend.textContent='Static backend unavailable';backend.className='warn';
  }
}

document.querySelector('#send').onclick=()=>{
  const destination=destinationInput.value.trim();
  if(!destination){document.querySelector('#inspector').textContent='Destination is required.';return;}
  const x=envelope();
  const identity=resolveDestination(destination);
  if(directory.length&&!identity)x.delivery_state='UNROUTABLE';
  state.outbox.unshift(x);persist();renderMailbox();
  document.querySelector('#inspector').textContent=JSON.stringify(x,null,2);
};
document.querySelector('#simulate').onclick=()=>{
  const queued=state.outbox.find(x=>x.delivery_state==='QUEUED');
  if(!queued)return;
  queued.delivery_state='DELIVERED';
  state.inbox.unshift({...queued,received_at:new Date().toISOString()});
  persist();renderMailbox();document.querySelector('#inspector').textContent=JSON.stringify(queued,null,2);
};
document.querySelector('#clear').onclick=()=>{
  state.outbox=[];state.inbox=[];persist();renderMailbox();document.querySelector('#inspector').textContent='{}';
};
document.querySelector('#export').onclick=()=>{
  const blob=new Blob([JSON.stringify(state,null,2)],{type:'application/json'});
  const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='neo-telegram-mailbox.json';a.click();URL.revokeObjectURL(a.href);
};
renderMailbox();loadBackend();
