"""Private browser session for NEO Gemini. Disabled until NEO_GEM_CHAT_PASSWORD is set."""
import hashlib,hmac,html,json,os,secrets,time
from http.cookies import SimpleCookie
PATH="/gemini"
def configured():
    return bool(os.getenv("NEO_GEM_GOOGLE_CLIENT_ID","") and os.getenv("NEO_GEM_GOOGLE_ALLOWED_SUB","")) and len(os.getenv("CROWN_BRIDGE_TOKEN",""))>=32
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
HTML='''<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>NEO Gemini Private Chat</title><meta name="google-signin-client-id" content="__NEO_GOOGLE_CLIENT_ID__"><style>body{font:16px system-ui;background:#091711;color:#e8f5ec;max-width:740px;margin:30px auto;padding:20px}input,textarea,button{font:inherit;padding:12px;border-radius:8px;border:1px solid #597565;background:#15281e;color:inherit}textarea{display:block;width:100%;box-sizing:border-box;min-height:90px}button{cursor:pointer;margin:10px 0}pre{white-space:pre-wrap;overflow-wrap:anywhere;background:#14271d;border-radius:10px;padding:20px}label{display:block;margin-top:20px}</style><h1>NEO Gemini</h1><p>Private, read-only Gemini Developer API assistant for NEO data.</p><section id="login"><div id="googleSignIn"></div></section><section id="chat" hidden><label>Ask Gemini<textarea id="prompt" maxlength="2000"></textarea></label><button id="send">Send</button><button id="logout">Sign out</button><pre id="answer" aria-live="polite"></pre></section><p id="status" role="status"></p><script>
const $=id=>document.getElementById(id),status=$('status');
async function api(path,data){const r=await fetch(path,{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)});const result=await r.json();if(!r.ok)throw Error(result.error||'Request unavailable');return result}
function onGoogleCredential(result){api('/gemini/google',{credential:result.credential}).then(()=>{$('login').hidden=true;$('chat').hidden=false;status.textContent='Signed in with Google'}).catch(e=>status.textContent=e.message)}
window.onGoogleCredential=onGoogleCredential;
const clientId=document.querySelector('meta[name="google-signin-client-id"]')?.content;
if(clientId){const script=document.createElement('script');script.src='https://accounts.google.com/gsi/client';script.async=true;script.onload=()=>{google.accounts.id.initialize({client_id:clientId,callback:onGoogleCredential});google.accounts.id.renderButton($('googleSignIn'),{theme:'outline',size:'large',text:'signin_with'})};document.head.append(script)}
$('send').onclick=async()=>{const btn=$('send');btn.disabled=true;status.textContent='Querying Gemini';try{const res=await api('/gemini/ask',{message:$('prompt').value});$('answer').textContent=res.response||'No text returned';status.textContent='Completed · tools: '+(res.tools_used||[]).join(', ')}catch(e){status.textContent=e.message}finally{btn.disabled=false}};
$('logout').onclick=async()=>{await api('/gemini/logout',{}).catch(()=>{});$('login').hidden=false;$('chat').hidden=true;$('answer').textContent='';status.textContent='Signed out'};
</script></html>'''
def get(handler):
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
