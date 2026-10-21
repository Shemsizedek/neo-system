"""Private browser session for NEO Gemini. Disabled until NEO_GEM_CHAT_PASSWORD is set."""
import hashlib,hmac,html,json,os,secrets,time
from http.cookies import SimpleCookie
PATH="/gemini"
def configured():
    return bool(os.getenv("NEO_GEM_GOOGLE_CLIENT_ID","") and (os.getenv("NEO_GEM_GOOGLE_ALLOWED_SUB","") or os.getenv("NEO_GEM_GOOGLE_ALLOWED_EMAIL",""))) and len(os.getenv("CROWN_BRIDGE_TOKEN",""))>=32
def signature(timestamp,nonce):
    key=os.environ["CROWN_BRIDGE_TOKEN"].encode()
    return hmac.new(key,("gem-chat:"+timestamp+":"+nonce).encode(),hashlib.sha256).hexdigest()
def session(handler):
    jar=SimpleCookie()
    try:jar.load(handler.headers.get("Cookie",""))
    except Exception:return False
    raw=jar.get("neo_gem_session")
    if raw is None:return False
    values=raw.value.split(".")
    if len(values)!=3:return False
    ts,nonce,mac=values
    if not ts.isdecimal() or not (0<=time.time()-int(ts)<3600):return False
    return hmac.compare_digest(signature(ts,nonce),mac)
def origin_ok(handler):
    origin=handler.headers.get("Origin","")
    host=handler.headers.get("Host","")
    return bool(host) and origin=="https://"+host
def payload(handler,maxsize=4096):
    length=handler.headers.get("Content-Length","")
    if not length.isdecimal() or not 1<=int(length)<=maxsize:raise ValueError("size")
    out=json.loads(handler.rfile.read(int(length)))
    if not isinstance(out,dict):raise ValueError("json")
    return out
HTML='''<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>NEO Gemini Private Chat</title><meta name="google-signin-client-id" content="__NEO_GOOGLE_CLIENT_ID__"><style>body{font:16px system-ui;background:#091711;color:#e8f5ec;max-width:740px;margin:20px auto;padding:clamp(12px,3vw,24px)}input,textarea,button{font:inherit;padding:12px;border-radius:8px;border:1px solid #597565;background:#15281e;color:inherit}textarea{display:block;width:100%;box-sizing:border-box;min-height:90px;line-height:1.5}button:disabled{opacity:.5;cursor:wait}.entry{border-radius:12px;padding:14px;margin:12px 0;white-space:pre-wrap;overflow-wrap:anywhere;line-height:1.6}.entry.user{background:#214332}.entry.assistant{background:#14271d}.meta{font-size:12px;opacity:.7}button{cursor:pointer;margin:10px 0}pre{white-space:pre-wrap;overflow-wrap:anywhere;background:#14271d;border-radius:10px;padding:20px}label{display:block;margin-top:20px}</style><h1>NEO Gemini <small style="font-size:12px;vertical-align:middle;opacity:.7">PRIVATE</small></h1><p>Your personal NEO assistant. Sign in with your authorized Google account.</p><section id="login"><div id="googleSignIn"></div></section><section id="chat" hidden><div id="conversation" role="log" aria-live="polite"></div><label>Message<textarea id="prompt" maxlength="2000" placeholder="Ask NEO Gemini or review a command from your Gem..."></textarea></label><button id="send">Send</button><button id="logout">Sign out</button></section><p id="status" role="status"></p><script>
const $=id=>document.getElementById(id),status=$('status');
// A Gem may prepare #prompt=<URL-encoded text>; fragments are not sent to the gateway.
// Never automatically execute handoff text. User must press Send after signing in.
function loadHandoff(){
 const fragment=location.hash.slice(1);
 if(!fragment||fragment.length>6500)return;
 const params=new URLSearchParams(fragment);
 const draft=params.get('prompt');
 if(typeof draft==='string'&&draft.length>0&&draft.length<=2000){
   $('prompt').value=draft;
   status.textContent='Draft received from Gemini Gem. Review it and press Send.';
 }
 history.replaceState(null,'',location.pathname+location.search);
}
loadHandoff();
async function api(path,data){const r=await fetch(path,{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)});const result=await r.json();if(!r.ok)throw Error(result.error||'Request unavailable');return result}
function onGoogleCredential(result){api('/gemini/google',{credential:result.credential}).then(()=>{$('login').hidden=true;$('chat').hidden=false;status.textContent='Signed in with Google'}).catch(e=>status.textContent=e.message)}
window.onGoogleCredential=onGoogleCredential;
const clientId=document.querySelector('meta[name="google-signin-client-id"]')?.content;
if(clientId){const script=document.createElement('script');script.src='https://accounts.google.com/gsi/client';script.async=true;script.onload=()=>{google.accounts.id.initialize({client_id:clientId,callback:onGoogleCredential});google.accounts.id.renderButton($('googleSignIn'),{theme:'outline',size:'large',text:'signin_with'})};document.head.append(script)}
fetch('/gemini/session',{credentials:'same-origin'}).then(r=>r.json()).then(x=>{if(x.authenticated){$('login').hidden=true;$('chat').hidden=false;status.textContent='Signed in with Google'}}).catch(()=>{});
function addEntry(kind,body,tools){const el=document.createElement('div');el.className='entry '+kind;if(kind==='assistant'){for(const line of String(body).split('\\n')){const p=document.createElement('div');const heading=line.match(/^(#{1,3})\\s+(.+)$/);const bullet=line.match(/^\\s*[-*]\\s+(.+)$/);if(heading){const h=document.createElement('strong');h.textContent=heading[2];p.append(h);p.style.marginTop='12px'}else if(bullet){p.textContent='• '+bullet[1];p.style.paddingLeft='12px'}else{p.textContent=line||'\\u00a0'}el.append(p)}}else{el.textContent=body}if(tools&&tools.length){const t=document.createElement('p');t.className='meta';t.textContent='NEO tools: '+tools.join(', ');el.append(t)}$('conversation').append(el);el.scrollIntoView({block:'nearest'})}
$('send').onclick=async()=>{const btn=$('send'),message=$('prompt').value.trim();if(!message)return;btn.disabled=true;status.textContent='Working...';addEntry('user',message);$('prompt').value='';try{const res=await api('/gemini/ask',{message});addEntry('assistant',res.response||'No response',res.tools_used||[]);status.textContent='Ready'}catch(e){addEntry('assistant','Request failed: '+e.message);status.textContent='Unable to complete request'}finally{btn.disabled=false}};
$('prompt').addEventListener('keydown',e=>{if(e.key==='Enter'&&(e.ctrlKey||e.metaKey)){$('send').click()}});
$('logout').onclick=async()=>{await api('/gemini/logout',{}).catch(()=>{});$('login').hidden=false;$('chat').hidden=true;$('conversation').replaceChildren();status.textContent='Signed out'};
</script></html>'''
def get(handler):
    if handler.path.split('?',1)[0]=='/gemini/session':
        return handler.respond(200,{'authenticated':bool(configured() and session(handler))})
    ready=configured()
    if ready:
        body=HTML.replace("__NEO_GOOGLE_CLIENT_ID__",html.escape(os.environ["NEO_GEM_GOOGLE_CLIENT_ID"],quote=True)).encode()
    else:
        body=b'<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>NEO Gemini Setup</title><style>body{font:16px system-ui;background:#091711;color:#e8f5ec;max-width:650px;margin:48px auto;padding:20px}p{line-height:1.65;color:#b9d6c2}</style><h1>NEO Gemini</h1><p>Google sign-in is not configured for this site yet. Configure the authorized Google OAuth client ID and account identity in the private server settings. Do not enter your Google password here.</p></html>'
    handler.send_response(200 if ready else 503)
    handler.send_header("Content-Type","text/html; charset=utf-8")
    handler.send_header("Cache-Control","no-store")
    handler.send_header("Content-Security-Policy","default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline' https://accounts.google.com; frame-src https://accounts.google.com; connect-src 'self' https://accounts.google.com; base-uri 'none'; form-action 'none'; frame-ancestors 'none'")
    handler.send_header("X-Content-Type-Options","nosniff")
    handler.send_header("Content-Length",str(len(body)))
    handler.end_headers();handler.wfile.write(body)
def post(handler):
    if not configured():return handler.respond(503,{"error":"private chat is not configured"})
    if not origin_ok(handler):return handler.respond(403,{"error":"origin rejected"})
    try:data=payload(handler)
    except (ValueError,json.JSONDecodeError):return handler.respond(400,{"error":"invalid request"})
    if handler.path=="/gemini/google":
        try:
            from gemini_google_auth import verify_google_credential
            verify_google_credential(data.get("credential"))
        except Exception:return handler.respond(401,{"error":"Google identity verification failed"})
        ts,nonce=str(int(time.time())),secrets.token_hex(16)
        cookie="neo_gem_session="+ts+"."+nonce+"."+signature(ts,nonce)+"; Path=/gemini; HttpOnly; Secure; SameSite=Strict; Max-Age=3600"
        body=b'{"ok":true}'
        handler.send_response(200);handler.send_header("Set-Cookie",cookie);handler.send_header("Content-Type","application/json");handler.send_header("Cache-Control","no-store");handler.send_header("Content-Length",str(len(body)));handler.end_headers();handler.wfile.write(body);return
    if handler.path=="/gemini/logout":
        body=b'{"ok":true}';handler.send_response(200);handler.send_header("Set-Cookie","neo_gem_session=; Path=/gemini; HttpOnly; Secure; SameSite=Strict; Max-Age=0");handler.send_header("Content-Type","application/json");handler.send_header("Content-Length",str(len(body)));handler.end_headers();handler.wfile.write(body);return
    if handler.path!="/gemini/ask":return handler.respond(404,{"error":"not found"})
    if not session(handler):return handler.respond(401,{"error":"login required"})
    msg=data.get("message")
    if not isinstance(msg,str) or not 1<=len(msg.strip())<=2000:return handler.respond(400,{"error":"invalid message"})
    try:
        from gemini_runtime import run
        result=run(msg.strip())
        answer="\n".join(p["text"] for p in result.get("response",{}).get("parts",[]) if isinstance(p,dict) and isinstance(p.get("text"),str))
        return handler.respond(200,{"response":answer[:12000],"tools_used":result.get("used_tools",[]),"independently_certified":False})
    except Exception:return handler.respond(502,{"error":"Gemini unavailable"})
