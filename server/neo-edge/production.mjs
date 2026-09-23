import http from 'node:http';
import https from 'node:https';
import { createNeoEdgeServer } from './server.mjs';
import { isWirePlatformPath, proxyWirePlatform, serveWireApp, wireServiceManifest } from './wire-app.mjs';
import { serveProductStatic } from './product-static.mjs';
import { handleNeoExchangeRequest } from '../../api/neo-exchange/server.mjs';
import { handleNeoTellerRequest } from '../neo-teller-backend/server.mjs';

const PORT=Number(process.env.PORT||8080);
const LEGACY_HOST='127.0.0.1';
const AI_GATEWAY_URL=String(process.env.AI_GATEWAY_URL||'').replace(/\/$/,'');

const SERVICE_UI=Object.freeze({
  'neo.holytemples.org':{name:'NEO System',role:'System Gateway',summary:'Unified production gateway for the NEO ecosystem.'},
  'router.holytemples.org':{name:'NEO Router',role:'Orchestration',summary:'Policy-aware routing and orchestration surface.'},
  'algo.holytemples.org':{name:'NEO Algo',role:'Reasoning Engine',summary:'Reasoning and algorithmic services for NEO.'},
  'prime.holytemples.org':{name:'NEO Prime',role:'Runtime Orchestrator',summary:'Runtime coordination and service control.'},
  'pay.holytemples.org':{name:'NEOpay',role:'Payments & Wallet',summary:'Bitcoin and Counterparty payment entrypoint with user-controlled signing boundaries.'},
  'neobank.holytemples.org':{name:'NEO Bank',role:'Community Exchange',summary:'Community Exchange System access and account services.'},
  'hub.holytemples.org':{name:'NEO Hub',role:'Public Portal',summary:'Public discovery portal for NEO services and products.'},
  'counter.holytemples.org':{name:'NEO Counter',role:'Commerce',summary:'Checkout, merchant and point-of-sale services.'},
  'neogram.holytemples.org':{name:'NEO Telegram',role:'Communications',summary:'NEO communications and messaging workspace.'},
  'neofx.holytemples.org':{name:'NEO Exchange',role:'Markets',summary:'Market discovery and exchange interface.'},
  'scan.holytemples.org':{name:'NEO Scan',role:'Explorer',summary:'Bitcoin and Counterparty explorer and records surface.'},
  'school.holytemples.org':{name:'NEO Cipher',role:'Learning Platform',summary:'GISD learning, curriculum and role-gated education services.'},
  'library.holytemples.org':{name:'NEO Library',role:'Knowledge',summary:'Public knowledge discovery and NEO library services.'},
  'book.holytemples.org':{name:'NEO Books',role:'Accounting Suite',summary:'NEO accounting, ledger and business-finance workspace.'},
  'neopads.holytemples.org':{name:'NEO Pads',role:'Marketplace',summary:'NEO marketplace and hospitality product surface.'},
  'neopass.holytemples.org':{name:'NEO Pass',role:'Identity',summary:'Identity and access entrypoint for NEO services.'},
  'neovision.holytemples.org':{name:'NEO TV',role:'Media',summary:'Media, live programming and entertainment hub.'},
  'noogle.holytemples.org':{name:'Noogle',role:'Search',summary:'Search and discovery across authorized NEO knowledge sources.'},
  'omnitrix.holytemples.org':{name:'Omnitrix',role:'Device Platform',summary:'Device, browser and NEO interface platform.'},
  'neodash.holytemples.org':{name:'NEO Dash',role:'Dashboard',summary:'Operations dashboard for the NEO ecosystem.'},
  'nomni.holytemples.org':{name:'N.O.M.N.I.',role:'Currency Platform',summary:'NOMNI asset information, valuation and integration services.'},
  'wallet.holytemples.org':{name:'NEO Treasury Wallet',role:'Wallet',summary:'Treasury wallet information and settlement entrypoint.'},
  'treasury.holytemples.org':{name:'World Treasury',role:'Treasury',summary:'Treasury and reserve information surface.'},
  'nvsn.holytemples.org':{name:'NEO Virtual Satellite Network',role:'Communications Fabric',summary:'Software-defined distributed communications fabric connecting authorized terrestrial, Internet, radio, telephone and satellite-capable nodes.'},
  'neoteric.holytemples.org':{name:'Neoteric Method',role:'Neotherapy Public Portal',summary:'Public Neotherapy information and entrypoint. The NEO System remains the source of truth for consent, credentials, sessions, evidence and audit records.'}
});

function hostOf(req){return String(req.headers['x-forwarded-host']||req.headers.host||'').split(',')[0].trim().split(':')[0].toLowerCase()}
function json(res,status,body){res.writeHead(status,{'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff'});res.end(JSON.stringify(body))}
function escapeHtml(value=''){return String(value).replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]))}
function html(res,status,body){res.writeHead(status,{'content-type':'text/html; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff','referrer-policy':'strict-origin-when-cross-origin','content-security-policy':"default-src 'self'; style-src 'unsafe-inline'; script-src 'unsafe-inline'; connect-src 'self'; img-src 'self' data: https:; frame-ancestors 'self' https://holytemples.org https://*.holytemples.org"});res.end(body)}

function serviceConsole(host){
  const service=SERVICE_UI[host]||{name:'NEO Service',role:'Production Service',summary:'NEO production service surface.'};
  const links=[
    ['NEO System','https://neo.holytemples.org'],['NEO Hub','https://hub.holytemples.org'],['NEOpay','https://pay.holytemples.org'],['NEO Counter','https://counter.holytemples.org'],['NEO Scan','https://scan.holytemples.org'],['Noogle','https://noogle.holytemples.org'],['NEO Books','https://book.holytemples.org'],['NEO Dash','https://neodash.holytemples.org']
  ];
  const cards=links.filter(([,url])=>!url.includes(`://${host}`)).map(([label,url])=>`<a class="card" href="${url}"><span>${escapeHtml(label)}</span><small>${escapeHtml(new URL(url).host)}</small></a>`).join('');
  const neoSyncAction=host==='neo.holytemples.org'?'<a class="btn" href="/neosync/">Open NEOsync</a>':'';
  const neotericActions=host==='neoteric.holytemples.org'?'<a class="btn primary" href="https://neotericmethod.minicart.com" rel="noopener">Open Shop</a><a class="btn" href="https://neo.holytemples.org/neotherapy/">Neotherapy Console</a>':'';
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(service.name)} · NEO</title><meta name="theme-color" content="#f4efe4"><style>
  :root{font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;color:#171511;background:#f4efe4}*{box-sizing:border-box}body{margin:0;min-height:100vh;background:radial-gradient(circle at 10% 0,#fff 0,#f4efe4 42%,#e7dfcf 100%)}a{color:inherit}.wrap{max-width:1180px;margin:auto;padding:26px}.top{display:flex;justify-content:space-between;align-items:center;gap:18px;padding:14px 0}.brand{font-weight:900;letter-spacing:.16em}.status{display:inline-flex;align-items:center;gap:8px;border:1px solid #b9ad96;border-radius:999px;padding:8px 12px;background:#fff9}.dot{width:9px;height:9px;border-radius:50%;background:#b79036;box-shadow:0 0 0 4px #b7903622}.hero{margin-top:36px;padding:42px;border:1px solid #cfc4ae;border-radius:28px;background:#ffffffc9;box-shadow:0 24px 80px #4b40251c;backdrop-filter:blur(14px)}.eyebrow{text-transform:uppercase;letter-spacing:.16em;font-size:.74rem;font-weight:800;color:#6c604d}.hero h1{font-size:clamp(2.5rem,8vw,5.8rem);line-height:.94;margin:14px 0 18px;max-width:900px}.hero p{font-size:1.08rem;line-height:1.65;color:#5d5446;max-width:760px}.actions{display:flex;gap:12px;flex-wrap:wrap;margin-top:26px}.btn{padding:13px 17px;border-radius:13px;border:1px solid #1e1b16;text-decoration:none;font-weight:800}.btn.primary{background:#1e1b16;color:#fff}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(190px,1fr));gap:14px;margin-top:22px}.card{display:flex;flex-direction:column;gap:5px;text-decoration:none;padding:19px;border:1px solid #d3c7b0;border-radius:18px;background:#fff9;transition:.15s transform,.15s box-shadow}.card:hover{transform:translateY(-2px);box-shadow:0 12px 28px #4b40251a}.card span{font-weight:900}.card small{color:#746956}.panel{margin-top:22px;padding:20px;border:1px solid #d3c7b0;border-radius:18px;background:#fff9}.metrics{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:14px}.metric b{display:block;font-size:1.25rem}.metric span{font-size:.8rem;color:#746956}.foot{padding:30px 2px;color:#6d6354;font-size:.82rem}@media(max-width:650px){.wrap{padding:17px}.hero{padding:27px 22px;border-radius:22px}.top{align-items:flex-start;flex-direction:column}.hero h1{font-size:3.1rem}}
  </style></head><body><main class="wrap"><header class="top"><div class="brand">NEO · HOLYTEMPLES.ORG</div><div class="status"><i class="dot" id="dot"></i><span id="status">Checking production…</span></div></header><section class="hero"><div class="eyebrow">${escapeHtml(service.role)} · ${escapeHtml(host)}</div><h1>${escapeHtml(service.name)}</h1><p>${escapeHtml(service.summary)} This interface is the human-facing production entrypoint; machine endpoints remain available separately for health, service discovery and integrations.</p><div class="actions">${neotericActions||('<a class="btn primary" href="/api">Open service API</a>'+neoSyncAction)}<a class="btn" href="/health">Health endpoint</a><a class="btn" href="https://holytemples.org">World Temple</a></div></section><section class="panel"><div class="metrics"><div class="metric"><b id="httpState">Connecting</b><span>Runtime status</span></div><div class="metric"><b>HTTPS</b><span>Transport</span></div><div class="metric"><b>${escapeHtml(service.role)}</b><span>Service class</span></div><div class="metric"><b>${escapeHtml(host)}</b><span>Canonical host</span></div></div></section><section class="grid">${cards}</section><footer class="foot">NEO System production surface · APIs and protected operations retain their existing authentication and authorization boundaries.</footer></main><script>
  fetch('/health',{headers:{accept:'application/json'}}).then(async r=>{if(!r.ok)throw new Error('HTTP '+r.status);const d=await r.json();document.getElementById('status').textContent='Live production';document.getElementById('httpState').textContent=d.ok===false?'Degraded':'Online';document.getElementById('dot').style.background=d.ok===false?'#c5792a':'#2a8a4a'}).catch(()=>{document.getElementById('status').textContent='Service needs attention';document.getElementById('httpState').textContent='Unavailable';document.getElementById('dot').style.background='#ad3c2f'});
  </script></body></html>`;
}


function proxyAiGateway(req,res){
  if(!AI_GATEWAY_URL)return json(res,503,{error:'neo_ai_gateway_unconfigured'});
  let target;
  try{target=new URL(req.url||'/',AI_GATEWAY_URL)}catch{return json(res,502,{error:'neo_ai_gateway_invalid_origin'})}
  const transport=target.protocol==='https:'?https:http;
  const headers={...req.headers,host:target.host,'x-forwarded-host':req.headers['x-forwarded-host']||req.headers.host||'neo.holytemples.org'};
  const upstream=transport.request(target,{method:req.method,headers},reply=>{
    const responseHeaders={...reply.headers};
    delete responseHeaders['access-control-allow-origin'];
    res.writeHead(reply.statusCode||502,responseHeaders);
    reply.pipe(res);
  });
  upstream.on('error',error=>json(res,502,{error:'neo_ai_gateway_unavailable',detail:error.message}));
  req.pipe(upstream);
}

function proxyLegacy(req,res,port){
  const headers={...req.headers,host:req.headers.host||'neo.holytemples.org','x-forwarded-host':req.headers['x-forwarded-host']||req.headers.host||''};
  const upstream=http.request({host:LEGACY_HOST,port,path:req.url||'/',method:req.method,headers},reply=>{res.writeHead(reply.statusCode||502,reply.headers);reply.pipe(res)});
  upstream.on('error',error=>json(res,502,{error:'neo_edge_upstream_unavailable',detail:error.message}));
  req.pipe(upstream);
}

export async function startNeoEdgeProduction(){
  const legacy=createNeoEdgeServer();
  await new Promise((resolve,reject)=>{legacy.once('error',reject);legacy.listen(0,LEGACY_HOST,resolve)});
  const legacyPort=legacy.address().port;
  const front=http.createServer(async(req,res)=>{
    const host=hostOf(req);
    const url=new URL(req.url||'/',`https://${host||'neo.holytemples.org'}`);
    if((host==='neofx.holytemples.org'||host==='finance.holytemples.org')&&url.pathname.startsWith('/api/neo-exchange/')){
      const handled=await handleNeoExchangeRequest(req,res,{fallthrough:true});
      if(handled!==false)return handled;
    }
    if(host==='teller.holytemples.org'&&url.pathname.startsWith('/api/v1/teller/')){
      const handled=await handleNeoTellerRequest(req,res,{fallthrough:true});
      if(handled!==false)return handled;
    }
    if(host==='neo.holytemples.org'&&url.pathname.startsWith('/api/ai/'))return proxyAiGateway(req,res);
    const productServed=await serveProductStatic(req,res,url,host);
    if(productServed!==false)return productServed;
    if(host!=='wire.holytemples.org'&&req.method==='GET'&&(url.pathname==='/'||url.pathname==='/ui'))return html(res,200,serviceConsole(host));
    if(host!=='wire.holytemples.org')return proxyLegacy(req,res,legacyPort);
    try{
      if(req.method==='GET'&&url.pathname==='/api/wire/status')return json(res,200,wireServiceManifest());
      if(isWirePlatformPath(url.pathname))return await proxyWirePlatform(req,res,url);
      const served=serveWireApp(req,res,url);if(served!==false)return served;
      return proxyLegacy(req,res,legacyPort);
    }catch(error){return json(res,500,{error:'neo_wire_edge_error',detail:String(error?.message||error)})}
  });
  front.on('close',()=>legacy.close());
  front.listen(PORT,'0.0.0.0',()=>console.log(`NEO edge production router listening on 0.0.0.0:${PORT}; legacy edge on ${LEGACY_HOST}:${legacyPort}`));
  return{front,legacy};
}

if(import.meta.url===`file://${process.argv[1]}`)startNeoEdgeProduction().catch(error=>{console.error(error);process.exitCode=1});
