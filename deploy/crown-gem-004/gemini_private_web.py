"""Private browser session for NEO Gemini. Disabled until NEO_GEM_CHAT_PASSWORD is set."""
import hashlib,hmac,html,json,os,secrets,time
from http.cookies import SimpleCookie
PATH="/gemini"
def configured():
    return len(os.getenv("NEO_GEM_CHAT_PASSWORD",""))>=24 and len(os.getenv("CROWN_BRIDGE_TOKEN",""))>=32
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
HTML='''<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>NEO Gemini Private Chat</title><style>body{font:16px system-ui;background:#091711;color:#e8f5ec;max-width:740px;margin:30px auto;padding:20px}input,textarea,button{font:inherit;padding:12px;border-radius:8px;border:1px solid #597565;background:#15281e;color:inherit}textarea{display:block;width:100%;box-sizing:border-box;min-height:90px}button{cursor:pointer;margin:10px 0}pre{white-space:pre-wrap;overflow-wrap:anywhere;background:#14271d;border-radius:10px;padding:20px}label{display:block;margin-top:20px}</style><h1>NEO Gemini</h1><p>Private, read-only Gemini Developer API assistant for NEO data.</p><section id="login"><label>Access passphrase <input type="password" id="pw" autocomplete="current-password"></label><button id="enter">Unlock</button></section><section id="chat" hidden><label>Ask Gemini<textarea id="prompt" maxlength="2000"></textarea></label><button id="send">Send</button><button id="logout">Sign out</button><pre id="answer" aria-live="polite"></pre></section><p id="status" role="status"></p><script>
const $=id=>document.getElementById(id),status=$('status');
async function api(path,data){const r=await fetch(path,{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)});const result=await r.json();if(!r.ok)throw Error(result.error||'Request unavailable');return result}
$('enter').onclick=async()=>{try{await api('/gemini/login',{password:$('pw').value});$('pw').value='';$('login').hidden=true;$('chat').hidden=false;status.textContent='Authenticated'}catch(e){status.textContent=e.message}};
$('send').onclick=async()=>{const btn=$('send');btn.disabled=true;status.textContent='Querying Gemini';try{const res=await api('/gemini/ask',{message:$('prompt').value});$('answer').textContent=res.response||'No text returned';status.textContent='Completed · tools: '+(res.tools_used||[]).join(', ')}catch(e){status.textContent=e.message}finally{btn.disabled=false}};
$('logout').onclick=async()=>{await api('/gemini/logout',{}).catch(()=>{});$('login').hidden=false;$('chat').hidden=true;$('answer').textContent='';status.textContent='Signed out'};
</script></html>'''
def get(handler):
    if not configured():return handler.respond(503,{"error":"private chat is not configured"})
    body=HTML.encode()
    handler.send_response(200)
    handler.send_header("Content-Type","text/html; charset=utf-8")
    handler.send_header("Cache-Control","no-store")
    handler.send_header("Content-Security-Policy","default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline'; connect-src 'self'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'")
    handler.send_header("X-Content-Type-Options","nosniff")
    handler.send_header("Content-Length",str(len(body)))
    handler.end_headers();handler.wfile.write(body)
def post(handler):
    if not configured():return handler.respond(503,{"error":"private chat is not configured"})
    if not origin_ok(handler):return handler.respond(403,{"error":"origin rejected"})
    try:data=payload(handler)
    except (ValueError,json.JSONDecodeError):return handler.respond(400,{"error":"invalid request"})
    if handler.path=="/gemini/login":
        pw=data.get("password")
        if not isinstance(pw,str) or not hmac.compare_digest(pw,os.environ["NEO_GEM_CHAT_PASSWORD"]):return handler.respond(401,{"error":"access denied"})
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
