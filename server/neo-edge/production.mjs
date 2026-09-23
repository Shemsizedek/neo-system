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
  'neoteric.holytemples.org':{name:'Neoteric Method',role:'Neotherapy Public Portal',summary:'Public Neotherapy information and entrypoint. The NEO System remains the source of truth for consent, credentials, sessions, evidence and audit records.'},
  'tabernacle.holytemples.org':{name:'NEO Tabernacle',role:'Storefront Gateway',summary:'Canonical Holy Temples commerce gateway for the Neoteric Method storefront.'}
});

function hostOf(req){return String(req.headers['x-forwarded-host']||req.headers.host||'').split(',')[0].trim().split(':')[0].toLowerCase()}
function json(res,status,body){res.writeHead(status,{'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff'});res.end(JSON.stringify(body))}
function escapeHtml(value=''){return String(value).replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]))}
function html(res,status,body){res.writeHead(status,{'content-type':'text/html; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff','referrer-policy':'strict-origin-when-cross-origin','content-security-policy':"default-src 'self'; style-src 'unsafe-inline'; script-src 'unsafe-inline'; connect-src 'self'; img-src 'self' data: https:; frame-ancestors 'self' https://holytemples.org https://*.holytemples.org"});res.end(body)}

function neotericLanding(){
  const pillars=['Nous','Perception','Cognition','Resonance','Illumination','Integration','Transformation'];
  const pillarCards=pillars.map((name,index)=>`<article class="pillar"><span>0${index+1}</span><b>${name}</b></article>`).join('');
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Neoteric Method · Neotherapy™</title><meta name="description" content="Neoteric Method is the public gateway to Neotherapy™, the applied practice of Noology."><meta name="theme-color" content="#101914"><style>
  :root{font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;color:#17211b;background:#f1eee5}*{box-sizing:border-box}html{scroll-behavior:smooth}body{margin:0;background:radial-gradient(circle at 90% 0,#dbe9d8 0,transparent 32%),#f1eee5;color:#17211b}a{color:inherit}.wrap{max-width:1180px;margin:auto;padding:24px}.top{display:flex;justify-content:space-between;align-items:center;gap:18px;padding:12px 0}.brand{font-weight:950;letter-spacing:.13em}.nav{display:flex;gap:16px;align-items:center;flex-wrap:wrap}.nav a{text-decoration:none;font-weight:750;font-size:.9rem}.hero{padding:72px 0 42px;display:grid;grid-template-columns:minmax(0,1.35fr) minmax(280px,.65fr);gap:28px;align-items:end}.eyebrow{text-transform:uppercase;letter-spacing:.17em;font-size:.72rem;font-weight:900;color:#55705d}.hero h1{font-size:clamp(3.5rem,10vw,7.8rem);line-height:.84;margin:14px 0 22px;letter-spacing:-.06em}.hero p{font-size:1.12rem;line-height:1.7;max-width:720px;color:#4f5d53}.actions{display:flex;gap:12px;flex-wrap:wrap;margin-top:28px}.btn{padding:14px 18px;border-radius:999px;border:1px solid #17211b;text-decoration:none;font-weight:850}.btn.primary{background:#17211b;color:#f8f5ed}.side{border:1px solid #aeb8aa;border-radius:28px;padding:26px;background:#ffffff8c;box-shadow:0 25px 70px #314b3820}.side b{display:block;font-size:1.25rem;margin-bottom:8px}.side p{font-size:.92rem;line-height:1.6;margin:0;color:#58665c}.section{padding:42px 0}.section h2{font-size:clamp(2rem,5vw,3.6rem);margin:0 0 10px;letter-spacing:-.04em}.lead{max-width:760px;line-height:1.7;color:#56645a}.pillars,.fields,.services{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:13px;margin-top:24px}.pillar,.field,.service{border:1px solid #b9c1b7;border-radius:20px;padding:20px;background:#faf9f4cc}.pillar span{display:block;font-size:.7rem;letter-spacing:.12em;color:#738078;margin-bottom:18px}.pillar b{font-size:1.08rem}.field b,.service b{display:block;margin-bottom:8px}.field p,.service p{margin:0;color:#657068;line-height:1.55;font-size:.9rem}.band{margin:34px 0;border-radius:30px;background:#17211b;color:#eef2eb;padding:34px}.band .lead{color:#cbd5cd}.band .btn{border-color:#eef2eb}.band .btn.primary{background:#eef2eb;color:#17211b}.notice{border-left:4px solid #6b8d70;padding:18px 20px;background:#e7eee4;border-radius:0 18px 18px 0;line-height:1.6}.foot{padding:38px 0;color:#68736b;font-size:.84rem;border-top:1px solid #c6cbc3;margin-top:38px}.live{display:inline-flex;align-items:center;gap:8px}.dot{width:8px;height:8px;border-radius:50%;background:#ad8c38}@media(max-width:760px){.hero{grid-template-columns:1fr;padding-top:44px}.top{align-items:flex-start;flex-direction:column}.hero h1{font-size:4.3rem}.wrap{padding:18px}}
  </style></head><body><main class="wrap"><header class="top"><div class="brand">NEOTERIC METHOD</div><nav class="nav"><a href="#method">Method</a><a href="#services">Services</a><a href="#safety">NFM-001</a><a href="https://tabernacle.holytemples.org" rel="noopener">Shop</a></nav></header><section class="hero"><div><div class="eyebrow">Noology · Nous Field Therapy · Neotherapy™</div><h1>Know.<br>Reason.<br>Transform.</h1><p>Neoteric Method is the public gateway to Neotherapy™, an applied practice of Noology centered on conscious awareness, disciplined reasoning, intentional reflection and human agency.</p><div class="actions"><a class="btn primary" href="https://tabernacle.holytemples.org" rel="noopener">Enter Shop</a><a class="btn" href="#services">Explore Services</a></div></div><aside class="side"><div class="live"><i class="dot" id="dot"></i><b id="status">Checking production…</b></div><p>The NEO System is the authoritative application layer for consent, credentials, sessions, evidence and audit records. Commerce remains separate from participant records.</p></aside></section><section class="section" id="method"><div class="eyebrow">The framework</div><h2>Seven Pillars</h2><p class="lead">The Neotherapeutic framework organizes practice around seven Noological pillars without treating them as diagnostic categories.</p><div class="pillars">${pillarCards}</div></section><section class="section"><div class="eyebrow">Practice domains</div><h2>Four Fields</h2><div class="fields"><article class="field"><b>Cognitive</b><p>Reasoning, attention, propositions and disciplined examination.</p></article><article class="field"><b>Philosophical</b><p>Meaning, assumptions, knowledge claims and reflective inquiry.</p></article><article class="field"><b>Sensory</b><p>Structured sensory practices governed by safety and evidence controls.</p></article><article class="field"><b>Behavioral</b><p>Intentional integration, practice and observable action.</p></article></div></section><section class="band" id="academy"><div class="eyebrow">Neotherapy Academy</div><h2>Learn the discipline.</h2><p class="lead">Study Noology, Noological Dialogue, logic and cognition, ethics and consent, session methods, research literacy, documentation, privacy and modality-specific practice through the Neoteric learning pathway.</p><div class="actions"><a class="btn primary" href="#method">Explore the Method</a><a class="btn" href="#safety">Review NFM-001</a></div></section><section class="section" id="services"><div class="eyebrow">Services & access</div><h2>One method. Clear boundaries.</h2><div class="services"><article class="service"><b>Noological Dialogue</b><p>Structured inquiry distinguishing fact, perception, hypothesis and unknowns.</p></article><article class="service"><b>Neotherapy Sessions</b><p>Consent-led sessions following the canonical seven-stage Neotherapeutic cycle.</p></article><article class="service"><b>Practitioner Pathway</b><p>Education, practicum, competency assessment and internal credential records.</p></article><article class="service"><b>Research Program</b><p>Evidence-led study with doctrine, hypothesis, observation and validated findings kept distinct.</p></article></div></section><section class="section" id="safety"><div class="eyebrow">NFM-001</div><h2>True Green Light</h2><div class="notice"><b>Experimental Noological sensory practice.</b> NFM-001 is not presented as having established clinical efficacy. Participation requires informed consent, appropriate safety screening, conservative equipment use and the ability to stop at any time. Neotherapy credentials do not themselves confer state healthcare licensure.</div></section><section class="band"><div class="eyebrow">Neoteric storefront</div><h2>Explore Neoteric Method.</h2><p class="lead">Products and public offerings are available through the external Minicart storefront. Participant and session records are not exported to the storefront.</p><div class="actions"><a class="btn primary" href="https://tabernacle.holytemples.org" rel="noopener">Shop Neoteric</a><a class="btn" href="#method">About the Method</a></div></section><footer class="foot">Neoteric Method · Neotherapy™ · Applied Noology<br><span>Education, wellness practice, research and commerce are presented with their respective professional and evidentiary boundaries.</span></footer></main><script>fetch('/health',{headers:{accept:'application/json'}}).then(r=>{if(!r.ok)throw new Error();document.getElementById('status').textContent='Live production';document.getElementById('dot').style.background='#438653'}).catch(()=>{document.getElementById('status').textContent='Service needs attention';document.getElementById('dot').style.background='#a7443b'});</script></body></html>`;
}

function serviceConsole(host){
  const service=SERVICE_UI[host]||{name:'NEO Service',role:'Production Service',summary:'NEO production service surface.'};
  const links=[
    ['NEO System','https://neo.holytemples.org'],['NEO Hub','https://hub.holytemples.org'],['NEOpay','https://pay.holytemples.org'],['NEO Counter','https://counter.holytemples.org'],['NEO Scan','https://scan.holytemples.org'],['Noogle','https://noogle.holytemples.org'],['NEO Books','https://book.holytemples.org'],['NEO Dash','https://neodash.holytemples.org']
  ];
  const cards=links.filter(([,url])=>!url.includes(`://${host}`)).map(([label,url])=>`<a class="card" href="${url}"><span>${escapeHtml(label)}</span><small>${escapeHtml(new URL(url).host)}</small></a>`).join('');
  const neoSyncAction=host==='neo.holytemples.org'?'<a class="btn" href="/neosync/">Open NEOsync</a>':'';
  const neotericActions=host==='neoteric.holytemples.org'?'<a class="btn primary" href="https://tabernacle.holytemples.org" rel="noopener">Open Shop</a><a class="btn" href="https://neo.holytemples.org/neotherapy/">Neotherapy Console</a>':'';
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
    if(host==='neoteric.holytemples.org'&&req.method==='GET'&&(url.pathname==='/'||url.pathname==='/ui'))return html(res,200,neotericLanding());
    if(host==='neoteric.holytemples.org'&&req.method==='GET'&&url.pathname==='/health')return json(res,200,{ok:true,service:'neoteric-method',surface:'public-production'});
    if(host==='tabernacle.holytemples.org'&&req.method==='GET'&&(url.pathname==='/'||url.pathname==='/ui')){res.writeHead(302,{location:'https://neotericmethod.minicart.com','cache-control':'no-store'});return res.end();}
    if(host==='neoteric.holytemples.org')return html(res,404,neotericLanding());
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
