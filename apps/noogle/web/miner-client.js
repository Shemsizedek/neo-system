const MINER_CANDIDATES=['http://127.0.0.1:14444','http://localhost:14444'];
let minerTimer=null;

function minerEls(){return {
  status:document.getElementById('minerStatus'),hash:document.getElementById('minerHashrate'),pool:document.getElementById('minerPool'),devices:document.getElementById('minerDevices'),endpoint:document.getElementById('minerEndpoint'),token:document.getElementById('minerToken'),connect:document.getElementById('minerConnect'),discover:document.getElementById('minerDiscover')
};}

function secureAdapterUrl(value){
  try{
    const u=new URL(value);
    const local=['localhost','127.0.0.1','::1'].includes(u.hostname);
    return u.protocol==='https:'||local?u:null;
  }catch{return null;}
}

async function adapterFetch(base,path,token,options={}){
  const u=secureAdapterUrl(base); if(!u) throw new Error('Use HTTPS or a localhost adapter');
  const headers={accept:'application/json',...(options.headers||{})};
  if(token) headers.authorization=`Bearer ${token}`;
  const controller=new AbortController(); const timer=setTimeout(()=>controller.abort(),3500);
  try{
    const r=await fetch(`${u.href.replace(/\/$/,'')}${path}`,{...options,headers,signal:controller.signal,cache:'no-store'});
    if(!r.ok) throw new Error(`Adapter ${r.status}`); return await r.json();
  }finally{clearTimeout(timer);}
}

function renderMiner(data,base){
  const e=minerEls();
  const devices=data.discoveredMiners||data.devices||[];
  const first=devices[0]||{};
  const hash=first.hashrate||first.hashRate||data.hashrate||data.hashRate||'—';
  e.status.textContent=data.agentState||data.status||'CONNECTED';
  e.hash.textContent=typeof hash==='number'?`${hash.toLocaleString()} H/s`:hash;
  e.pool.textContent=first.pool||data.pool||'Connected adapter';
  e.devices.textContent=String(devices.length||data.deviceCount||0);
  e.status.className='badge safe';
  localStorage.setItem('omnitrix-miner-endpoint',base);
}

async function connectMiner(base,token){
  const e=minerEls(); e.status.textContent='CONNECTING';
  const data=await adapterFetch(base,'/status',token);
  renderMiner(data,base);
  clearInterval(minerTimer);
  minerTimer=setInterval(()=>adapterFetch(base,'/status',token).then(d=>renderMiner(d,base)).catch(()=>{e.status.textContent='OFFLINE';e.status.className='badge warning';}),5000);
  return data;
}

async function discoverAdapter(){
  const e=minerEls(); e.status.textContent='DISCOVERING';
  const configured=e.endpoint?.value?.trim();
  const candidates=[configured,...MINER_CANDIDATES].filter(Boolean);
  for(const base of [...new Set(candidates)]){
    try{await adapterFetch(base,'/health',''); e.endpoint.value=base; e.status.textContent='FOUND'; return base;}catch{}
  }
  e.status.textContent='NOT FOUND'; e.status.className='badge warning';
  throw new Error('No reachable miner adapter found. Start the NEO Miner adapter or enter its secure URL.');
}

const e=minerEls();
if(e.endpoint){e.endpoint.value=localStorage.getItem('omnitrix-miner-endpoint')||'';}
e.connect?.addEventListener('click',()=>connectMiner(e.endpoint.value.trim(),e.token.value.trim()).catch(err=>{e.status.textContent='CONNECTION ERROR';e.status.className='badge warning';document.getElementById('minerMessage').textContent=err.message;}));
e.discover?.addEventListener('click',()=>discoverAdapter().then(base=>document.getElementById('minerMessage').textContent=`Secure adapter discovered at ${base}`).catch(err=>document.getElementById('minerMessage').textContent=err.message));
