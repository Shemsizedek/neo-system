import { createPairingPreview } from './pairing-preview.mjs';
import http from 'node:http';

const port = Number(process.env.PORT || 10000);
const searchHome = 'https://noogle.holytemples.org/';
const denyHeaders = {
  'cache-control': 'no-store, private',
  'x-content-type-options': 'nosniff',
  'referrer-policy': 'no-referrer',
  'content-security-policy': "default-src 'none'; frame-ancestors 'none'"
};
const json = (res, status, body) => {
  res.writeHead(status, { ...denyHeaders, 'content-type':'application/json; charset=utf-8' });
  res.end(JSON.stringify(body));
};

// Curated public navigation only. No production indexes or private NEO data.
const publicCatalog = Object.freeze([
  { title:'World Temple of Karast',url:'https://holytemples.org/',tags:'temple ministry public'},
  { title:'World Education',url:'https://holytemples.org/holy-orders/',tags:'ministry education orders'},
  { title:'NEO System GitHub',url:'https://github.com/Shemsizedek/neo-system',tags:'neo development code'},
  { title:'Noogle production',url:'https://noogle.holytemples.org/',tags:'noogle search production'}
]);
export function createStagingServer() {
  const preview=createPairingPreview();
  return http.createServer(async (req,res) => {
    let pathname;
    try { pathname = new URL(req.url || '/', 'http://127.0.0.1').pathname; }
    catch { return json(res,400,{error:'invalid_request'}); }
    if(req.method==='GET' && pathname==='/manifest.webmanifest') {res.writeHead(200,{'content-type':'application/manifest+json','cache-control':'public, max-age=300'});return res.end("{\"id\":\"/\",\"name\":\"Noogle Connect — Device Hub\",\"short_name\":\"Noogle Connect\",\"start_url\":\"/\",\"scope\":\"/\",\"display\":\"standalone\",\"background_color\":\"#071b17\",\"theme_color\":\"#071b17\",\"icons\":[{\"src\":\"/noogle-icon.svg\",\"sizes\":\"any\",\"type\":\"image/svg+xml\",\"purpose\":\"any maskable\"}]}");}
    if(req.method==='GET' && pathname==='/noogle-icon.svg') {res.writeHead(200,{'content-type':'image/svg+xml','cache-control':'public, max-age=86400','x-content-type-options':'nosniff'});return res.end("<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 192 192\"><rect width=\"192\" height=\"192\" rx=\"40\" fill=\"#071b17\"/><circle cx=\"96\" cy=\"96\" r=\"69\" fill=\"none\" stroke=\"#56e995\" stroke-width=\"12\"/><path d=\"M61 125V66l70 59V66\" fill=\"none\" stroke=\"#e9fff0\" stroke-width=\"12\"/></svg>");}
    // Staging-only protocol simulation: no NEO Pass, real enrollment, or control privileges.
    if(pathname.startsWith('/preview/pair/')) {
      if(req.method !== 'POST') return json(res,405,{error:'method_not_allowed'});
      if(req.headers.origin && !['https://noogle-connect-staging.onrender.com','https://connect.holytemples.org'].includes(req.headers.origin))
        return json(res,403,{error:'origin_denied'});
      if(req.headers['content-type']?.split(';')[0] !== 'application/json')
        return json(res,415,{error:'json_required'});
      let raw='';
      try {
        for await (const part of req) {
          raw+=part.toString('utf8');
          if(raw.length>2048) return json(res,413,{error:'payload_too_large'});
        }
        const body=JSON.parse(raw);
        const action=pathname.slice('/preview/pair/'.length);
        const result=action==='create'?preview.create()
          :action==='join'?preview.join(body)
          :action==='approve'?preview.approve(body)
          :action==='status'?preview.status(body)
          :action==='ping'?preview.ping(body)
          :action==='signal-status'?preview.signalStatus(body)
          :{status:404,body:{error:'not_found'}};
        return json(res,result.status,result.body);
      }catch{return json(res,400,{error:'invalid_json'});}
    }
    if(req.method === 'GET' && pathname === '/search') {
      const query=new URL(req.url,'http://127.0.0.1').searchParams.get('q')?.trim().slice(0,100) || '';
      const terms=query.toLowerCase().split(/\s+/).filter(Boolean);
      const results=terms.length ? publicCatalog.filter(item=>terms.every(term=>(item.title+' '+item.tags).toLowerCase().includes(term))) : publicCatalog;
      return json(res,200,{mode:'curated-public-preview',liveIndex:false,query,results,count:results.length});
    }
    if(req.method === 'GET' && pathname === '/healthz')
      return json(res,200,{ok:true,service:'noogle-connect-render-staging',mode:'read-only'});
    if(req.method === 'GET' && pathname === '/') {
      res.writeHead(200,{
        'content-type':'text/html; charset=utf-8','cache-control':'no-store',
        'x-content-type-options':'nosniff','referrer-policy':'no-referrer',
        'content-security-policy':"default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline'; connect-src 'self'; frame-ancestors 'none'"
      });
      return res.end(`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="theme-color" content="#071b17"><title>Noogle Connect — Device Hub</title><link rel="manifest" href="/manifest.webmanifest"><link rel="icon" href="/noogle-icon.svg" type="image/svg+xml">
<style>
:root{font-family:Inter,system-ui,-apple-system,sans-serif;background:#071b17;color:#eff9f3}*{box-sizing:border-box}body{margin:0;background:radial-gradient(ellipse at 80% -15%,#1b5840 0,transparent 45%),#071b17;min-height:100vh}button{font:inherit}a{color:#a3ecc0}main{max-width:1100px;margin:auto;padding:24px clamp(18px,4vw,48px) 60px}
nav{display:flex;align-items:center;justify-content:space-between;gap:15px;padding-bottom:34px;flex-wrap:wrap}.logo{display:flex;gap:12px;align-items:center;font-weight:850;letter-spacing:.02em;font-size:1.3rem}.mark{display:grid;place-items:center;width:39px;height:39px;border-radius:13px;background:#aaf2c4;color:#09251b;font-weight:900}.toplink{font-size:.88rem;color:#c0d4c8;text-decoration:none}
.hero{display:grid;grid-template-columns:minmax(0,1.2fr) minmax(250px,.8fr);gap:28px;align-items:center;margin-bottom:32px}.eyebrow{font-weight:700;color:#9bf0bd;text-transform:uppercase;font-size:.74rem;letter-spacing:.17em}h1{font-size:clamp(2.3rem,5vw,4.15rem);letter-spacing:-.05em;line-height:1.07;margin:14px 0}h2{font-size:1.23rem;margin:0 0 9px;letter-spacing:-.02em}p{color:#bdd1c5;line-height:1.6;margin:9px 0}.intro{font-size:1.05rem;max-width:560px}.illustration{background:linear-gradient(135deg,#194b38,#0e2d24);border:1px solid #44735a;border-radius:26px;min-height:235px;display:flex;align-items:center;justify-content:center;gap:13px;position:relative;overflow:hidden}.illustration:after{content:'';position:absolute;inset:25px;border:1px dashed #598d70;border-radius:20px;pointer-events:none}.device{background:#0b201b;border:3px solid #89cba3;box-shadow:0 15px 30px #07140f88;z-index:1;display:grid;place-items:center;color:#aaf2c4}.phone{width:72px;height:137px;border-radius:15px}.laptop{width:165px;height:110px;border-radius:10px;font-size:2.2rem}.connection{z-index:1;color:#aeefc5;font-size:2rem}.pill{display:inline-flex;align-items:center;gap:8px;border:1px solid #426c52;border-radius:999px;padding:7px 11px;background:#143528;color:#d0e7d7;font-size:.78rem}.dot{height:8px;width:8px;background:#78e6aa;border-radius:50%}.grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:16px}.panel input{display:block;max-width:100%;width:100%;background:#0b211a;border:1px solid #6f9b7c;border-radius:10px;color:#fff;padding:12px;font:inherit;margin:7px 0 12px}.panel button:disabled{opacity:.5;cursor:not-allowed}.panel{background:#112b22;border:1px solid #315743;border-radius:20px;padding:24px}.panel.feature{background:linear-gradient(145deg,#153d2d,#10281f)}.muted{font-size:.85rem;color:#b2cbb9}.icon{font-size:1.7rem;display:block;margin-bottom:16px}.action{background:#a8f0c2;border:0;border-radius:11px;color:#082218;padding:14px 20px;font-weight:800;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;gap:9px;margin-top:16px}.action:hover{background:#d1ffdf}.action:focus-visible,a:focus-visible{outline:3px solid #fff;outline-offset:3px}.secondary{border:1px solid #618d71;background:#1a3f2d;color:#e0f7e8;border-radius:10px;padding:11px 15px;font-weight:700;text-decoration:none;display:inline-block;margin-top:14px}.label{font-size:.72rem;text-transform:uppercase;letter-spacing:.12em;color:#a8d8b7;font-weight:800}.statusline{display:flex;justify-content:space-between;gap:10px;margin-top:15px;padding:12px 0;border-top:1px solid #375442;align-items:center;font-size:.88rem}.state{color:#e4bb7a}.statusgood{color:#a7e9ba}.steps{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:15px;margin-top:20px}.step{background:#0e281e;padding:17px;border:1px solid #2e4c3b;border-radius:15px}.number{display:inline-grid;place-items:center;width:28px;height:28px;background:#29513a;border-radius:9px;color:#bff3ce;font-weight:800;margin-bottom:9px}.step strong{display:block;margin-bottom:5px}.step p{font-size:.83rem;margin:0}.sectiontitle{margin:35px 0 15px}.foot{border-top:1px solid #345541;margin-top:36px;padding-top:15px;font-size:.8rem;color:#9bb4a4}#probe-result{margin-top:12px;color:#b6e5c5;min-height:20px;font-size:.89rem}
@media(max-width:740px){.hero{grid-template-columns:1fr}.illustration{min-height:200px}.steps{grid-template-columns:1fr}.grid{grid-template-columns:1fr}nav{padding-bottom:18px}.panel{padding:20px}}@media(prefers-reduced-motion:reduce){*{scroll-behavior:auto}}
</style></head><body><main><nav><div class="logo"><span class="mark">N</span><span>Noogle <span style="font-weight:450;color:#b8d5c3">Connect</span></span></div><span class="pill"><span class="dot"></span> Live pairing · Terminal access restricted</span></nav>
<section class="hero"><div><div class="eyebrow">Your devices. One secure connection.</div><h1>Connect your<br>NEO devices.</h1><p class="intro">A simple home for linking your Android phone and Chromebook through NEO Pass. Pair your device browsers now with an approval code and automatic connection status. Remote terminal access will require verified NEO Pass authentication and a device companion.</p><button id="check" class="action" type="button">Check this device →</button><p id="probe-result" role="status" aria-live="polite">Device check uses browser capabilities only.</p></div><div class="illustration" role="img" aria-label="Illustration of phone and Chromebook with a secure connection"><div class="device phone">▣</div><span class="connection">⌁</span><div class="device laptop">▤</div></div></section>
<section class="panel feature" aria-label="One tap device connection" style="margin-bottom:22px"><span class="label">Noogle Connect · Device Hub</span><h2>Your devices, one dashboard</h2><p>Select Connect to check this device and securely start a browser-to-browser connection. A verified NEO Pass session and a device-side terminal agent will be required before terminal access can be granted.</p><button id="one-tap-connect" type="button" class="action">Connect this device →</button><a class="secondary" href="https://neopass.holytemples.org/" id="neopass-entry" rel="noopener noreferrer">NEO Pass sign-in ↗</a><p id="one-tap-result" role="status" aria-live="polite">Not connected. No commands or permissions requested.</p><p class="muted">Android · Chromebook · Desktop · Tablet · Eligible browser devices. Remote terminal is not enabled yet.</p></section>
<section class="panel" aria-label="NEO Mask passkey readiness" style="margin-bottom:20px"><span class="label">NEO Mask · Passkey readiness</span><h2>Use your device PIN or fingerprint</h2><p>NEO Mask will use your browser's platform passkeys (Google Password Manager, Apple, Windows Hello and other supported providers). Your fingerprint and PIN remain protected by the device; Noogle never receives them.</p><button class="secondary" type="button" id="neomask-check">Check passkey support</button><p id="neomask-result" role="status" aria-live="polite">Passkey enrollment awaits verified NEO Pass identity and credential storage.</p><p class="muted">Bitcoin anchoring is a future audit feature, not live authentication or an on-chain storage location for credentials.</p></section>
<section class="grid" aria-label="Device connections"><article class="panel feature"><span class="icon" aria-hidden="true">📱</span><span class="label">Device 01</span><h2>Android phone</h2><p>Open this page on Android to pair with another browser and exchange live connection pings. Platform passkey compatibility can be checked below.</p><div class="statusline"><span>Browser pairing</span><strong class="statusgood">Live</strong></div></article><article class="panel feature"><span class="icon" aria-hidden="true">💻</span><span class="label">Device 02</span><h2>Chromebook</h2><p>Open this page on your Chromebook, approve pairing, and exchange live connection pings with another browser.</p><div class="statusline"><span>Browser-to-browser signals</span><strong class="statusgood">Live</strong></div></article></section>
<h2 class="sectiontitle">How connection will work</h2><section class="steps" aria-label="Connection steps"><div class="step"><span class="number">1</span><strong>Open on both devices</strong><p>Visit this page using your Android phone and Chromebook.</p></div><div class="step"><span class="number">2</span><strong>Sign in with NEO Pass</strong><p>NEO Pass sign-in will become available when its identity service is online and verified.</p></div><div class="step"><span class="number">3</span><strong>Approve securely</strong><p>Browser pairing is live today and requires approval on your first device.</p></div></section>
<section class="grid" style="margin-top:26px"><article class="panel"><span class="label">Security</span><h2>Protected by design</h2><p>Device enrollment, document signing, voting and remote terminal commands are disabled in this preview. Nothing here can remotely control your devices.</p><span class="pill">🔒 Restricted operations blocked</span></article><article class="panel"><span class="label">Staging status</span><h2>Connection service</h2><p id="service-status">Checking staging health…</p><button id="refresh" type="button" class="secondary">Refresh service status</button></article></section>
<section class="panel" style="margin-top:24px" aria-label="Pairing demonstration"><span class="label">Interactive preview · No device permissions</span><h2>Try connecting two browsers</h2><p>This is a temporary approval demonstration, not NEO Pass login or actual device enrollment. Open this page on your phone and Chromebook.</p><div class="grid"><div><h2>Device A · Start</h2><button class="action" id="pair-start" type="button">Create pairing code</button><p id="pair-code" aria-live="polite">A short-lived code will appear here.</p><button class="secondary" id="pair-approve" type="button" disabled>Approve request</button></div><div><h2>Device B · Join</h2><label for="pair-id">Session ID</label><input id="pair-id" aria-label="Session ID" autocomplete="off" placeholder="Paste session ID"><label for="pair-pin">Six-digit code</label><input id="pair-pin" aria-label="Six-digit pairing code" maxlength="6" inputmode="numeric" autocomplete="off" placeholder="000000"><button class="action" id="pair-join" type="button">Request approval</button></div></div><p id="pair-status" role="status" aria-live="polite">No pairing request active.</p><button id="pair-refresh" class="secondary" type="button">Check request status</button><div class="statusline"><span>After approval, test a real browser-to-browser signal through this service (no device access)</span></div><button id="pair-ping" class="secondary" type="button">Send connection ping</button><button id="pair-check-ping" class="secondary" type="button">Check incoming pings</button><p id="pair-ping-result" role="status" aria-live="polite">Approve pairing first. No device data is transmitted.</p><p class="muted">Credentials are held in this tab only. Sessions expire after 30 minutes or when the staging server restarts. No devices are enrolled.</p></section><div class="foot">Noogle Connect · Live browser pairing service · NEO Pass terminal authorization is not yet connected.</div></main>
<script>
const probe=document.getElementById('probe-result'),status=document.getElementById('service-status');
async function health(){status.textContent='Checking staging health…';try{const r=await fetch('/healthz',{cache:'no-store'});const j=await r.json();status.textContent=r.ok&&j.ok?'Online · Browser pairing and signaling available':'Service unavailable';}catch{status.textContent='Unable to reach staging service';}}
document.getElementById('refresh').addEventListener('click',health);
document.getElementById('check').addEventListener('click',async()=>{const secure=window.isSecureContext;const passkeys=!!window.PublicKeyCredential;let platform='unknown';const agent=navigator.userAgent||'';if(/Android/i.test(agent))platform='Android';else if(/CrOS/i.test(agent))platform='Chromebook';else platform='browser';probe.textContent=(secure?'Secure browser':'Browser security unavailable')+' · '+platform+' · '+(passkeys?'Passkey API supported':'Passkey API unavailable')+'. Real device enrollment is not enabled.';});

let pair=null;
const pairStatus=document.getElementById('pair-status');
async function pairCall(action,data){const response=await fetch('/preview/pair/'+action,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(data)});const payload=await response.json();if(!response.ok)throw Error(payload.error||'Pairing preview unavailable');return payload;}
document.getElementById('pair-start').addEventListener('click',async()=>{try{const result=await pairCall('create',{});pair={id:result.id,credential:result.owner,owner:true};document.getElementById('pair-code').textContent='Session ID: '+result.id+' | Code: '+result.code+' (30 minutes)';pairStatus.textContent='Share the session ID and code directly with your second device.';}catch(e){pairStatus.textContent=e.message;}});
document.getElementById('pair-join').addEventListener('click',async()=>{try{const id=document.getElementById('pair-id').value.trim(),code=document.getElementById('pair-pin').value.trim();if(!/^[0-9]{6}$/.test(code)){pairStatus.textContent='Enter a six-digit code.';return;}const result=await pairCall('join',{id,code});pair={id,credential:result.joiner,owner:false};document.getElementById('pair-pin').value='';pairStatus.textContent='Approval requested. Ask Device A to select Check request status, then Approve request.';}catch(e){pairStatus.textContent='Pairing request rejected or expired.';}});
document.getElementById('pair-refresh').addEventListener('click',async()=>{if(!pair){pairStatus.textContent='Create or join a pairing session first.';return;}try{const r=await pairCall('status',{id:pair.id,credential:pair.credential});pairStatus.textContent='Pairing preview: '+r.state+' · No device permissions granted.';document.getElementById('pair-approve').disabled=!(pair.owner&&r.state==='awaiting_approval');}catch{pairStatus.textContent='Pairing session expired or unavailable.';document.getElementById('pair-approve').disabled=true;}});
document.getElementById('pair-approve').addEventListener('click',async()=>{if(!pair||!pair.owner)return;try{const r=await pairCall('approve',{id:pair.id,owner:pair.credential});pairStatus.textContent='Approved demonstration · '+r.state+' · No devices enrolled.';document.getElementById('pair-approve').disabled=true;}catch{pairStatus.textContent='Approval could not be completed.';}});
document.getElementById('pair-ping').addEventListener('click',async()=>{const output=document.getElementById('pair-ping-result');if(!pair){output.textContent='Create or join pairing first.';return;}try{await pairCall('ping',{id:pair.id,credential:pair.credential});output.textContent='Ping delivered to temporary session. Ask the other browser to check incoming pings.';}catch{output.textContent='Both browsers must join and approve before signaling.';}});
document.getElementById('pair-check-ping').addEventListener('click',async()=>{const output=document.getElementById('pair-ping-result');if(!pair){output.textContent='Create or join pairing first.';return;}try{const result=await pairCall('signal-status',{id:pair.id,credential:pair.credential});output.textContent='Pings received from the other browser: '+result.received+'. No device access granted.';}catch{output.textContent='Connection not yet approved or expired.';}});
document.getElementById('one-tap-connect').addEventListener('click',async()=>{const out=document.getElementById('one-tap-result');out.textContent='Checking secure connection…';try{const h=await fetch('/healthz',{cache:'no-store'});if(!h.ok)throw Error();const session=await pairCall('create',{});pair={id:session.id,credential:session.owner,owner:true};document.getElementById('pair-code').textContent='Session ID: '+session.id+' | Code: '+session.code+' (30 minutes)';out.textContent='Secure browser session ready. Open Noogle Connect on your other device to approve pairing below. Terminal access requires NEO Pass and the companion agent.';document.getElementById('pair-status').textContent='Connection session ready. Enter the ID and code on your second device.';}catch{out.textContent='Connection service unavailable. Retry shortly.';}});
// Automatically refresh preview pairing state without granting device privileges.
let lastPairState='';
async function refreshPairState(){
 if(!pair)return;
 try{
  const state=await pairCall('status',{id:pair.id,credential:pair.credential});
  document.getElementById('pair-approve').disabled=!(pair.owner&&state.state==='awaiting_approval');
  if(state.state!==lastPairState){
   lastPairState=state.state;
   const labels={pending:'Waiting for another browser…',awaiting_approval:pair.owner?'Another browser joined. Approve request below.':'Waiting for approval from first browser…',approved_preview:'Browsers paired for temporary signaling. No terminal or device permissions granted.'};
   pairStatus.textContent=labels[state.state]||'Pairing state: '+state.state;
  }
  if(state.state==='approved_preview'){
   const signal=await pairCall('signal-status',{id:pair.id,credential:pair.credential});
   document.getElementById('pair-ping-result').textContent='Pings received from other browser: '+signal.received+'. No terminal permissions granted.';
  }
 }catch{
  lastPairState='expired';
  pairStatus.textContent='Session expired or interrupted. Select Connect this device to start again.';
  document.getElementById('pair-approve').disabled=true;
  pair=null;
 }
}
document.getElementById('neomask-check').addEventListener('click',async()=>{const out=document.getElementById('neomask-result');if(!window.isSecureContext||!window.PublicKeyCredential){out.textContent='This browser does not expose secure WebAuthn passkeys here.';return;}try{const platform=await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();out.textContent=platform?'Device PIN/fingerprint passkeys are supported here. Enrollment will be available after verified NEO Pass account setup.':'WebAuthn is available, but a built-in platform authenticator was not detected.';}catch{out.textContent='Unable to determine passkey support on this browser.';}});
setInterval(()=>{if(!document.hidden)refreshPairState();},3000);
document.addEventListener('visibilitychange',()=>{if(!document.hidden)refreshPairState();});
health();
</script></body></html>`);
    }
    if(pathname === '/connect' || pathname.startsWith('/connect/') || pathname.startsWith('/api/'))
      return json(res,403,{error:'staging_capability_disabled',authentication:'not_configured',device_enrollment:false,document_signing:false,remote_terminal:false});
    return json(res,404,{error:'not_found'});
  });
}

if(import.meta.url === `file://${process.argv[1]}`) {
  createStagingServer().listen(port,'0.0.0.0',()=>console.log('Noogle Connect staging listening'));
}
