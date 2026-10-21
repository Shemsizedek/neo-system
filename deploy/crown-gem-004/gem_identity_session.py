"""GEM-101: identity-bound browser-session contract for development approvals.
Not mounted on the live gateway. Issuance requires a Google-verified subject
obtained by the existing ID-token verifier, never a request-supplied name.
"""
import hashlib,hmac,re,secrets,time
from http.cookies import SimpleCookie

def issue(subject,secret,now=None):
    if not isinstance(subject,str) or not re.fullmatch(r"[A-Za-z0-9_-]{8,160}",subject):
        raise ValueError("invalid verified Google subject")
    if not isinstance(secret,bytes) or len(secret)<32:raise ValueError("invalid signing secret")
    ts=str(int(time.time() if now is None else now))
    nonce=secrets.token_hex(16)
    body="v2."+ts+"."+subject+"."+nonce
    signature=hmac.new(secret,("neo-gem-approval:"+body).encode(),hashlib.sha256).hexdigest()
    return body+"."+signature

def verify(raw,secret,now=None):
    if not isinstance(raw,str) or len(raw)>400 or not isinstance(secret,bytes) or len(secret)<32:return None
    parts=raw.split(".")
    if len(parts)!=5:return None
    version,ts,subject,nonce,mac=parts
    if version!="v2" or not ts.isdecimal() or not re.fullmatch(r"[A-Za-z0-9_-]{8,160}",subject) or not re.fullmatch(r"[0-9a-f]{32}",nonce) or not re.fullmatch(r"[0-9a-f]{64}",mac):return None
    current=time.time() if now is None else now
    if not 0<=current-int(ts)<900:return None
    expected=hmac.new(secret,("neo-gem-approval:"+".".join(parts[:4])).encode(),hashlib.sha256).hexdigest()
    return subject if hmac.compare_digest(mac,expected) else None

def cookie_subject(cookie_header,secret,now=None):
    jar=SimpleCookie()
    try:jar.load(cookie_header)
    except Exception:return None
    value=jar.get("neo_gem_approval")
    return verify(value.value,secret,now) if value is not None else None
