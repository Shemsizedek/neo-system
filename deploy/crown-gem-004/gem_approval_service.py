"""GEM-097: server-held one-shot approvals bound to exact GitHub PR inputs.

No public endpoint is mounted. This service must be called only after the
existing Google session is authenticated server-side. Shared durable storage
is required across workers before production use.
"""
import hashlib,hmac,json,secrets,time

def canonical(repo,base,head,commit,manifest_digest,title):
    if repo!="Shemsizedek/neo-system" or base!="feat/crown-gem-003-staging-bridge":
        raise ValueError("repository scope")
    if not isinstance(commit,str) or len(commit)!=40 or any(c not in "0123456789abcdef" for c in commit):
        raise ValueError("commit must be pinned")
    if not isinstance(manifest_digest,str) or len(manifest_digest)!=64 or any(c not in "0123456789abcdef" for c in manifest_digest):
        raise ValueError("manifest must be pinned")
    if head!="gem-development/"+manifest_digest[:16]:raise ValueError("head mismatch")
    if not isinstance(title,str) or not 1<=len(title)<=120:raise ValueError("title")
    return json.dumps([repo,base,head,commit,manifest_digest,title],separators=(",",":"))

class OneShotApprovals:
    """Test-only in-memory implementation; production requires atomic durable CAS."""
    def __init__(self,secret):
        if not isinstance(secret,bytes) or len(secret)<32:raise ValueError("secret")
        self._secret=secret
        self._issued={}
    def issue(self,subject,details,authenticated=False,now=None):
        if authenticated is not True or not isinstance(subject,str) or not subject:
            raise PermissionError("verified owner session required")
        stamp=time.time() if now is None else now
        nonce=secrets.token_hex(16)
        digest=hashlib.sha256(details.encode()).hexdigest()
        mac=hmac.new(self._secret,(nonce+":"+subject+":"+digest).encode(),hashlib.sha256).hexdigest()
        token=nonce+"."+mac
        self._issued[nonce]=(subject,digest,stamp+180,False)
        return token
    def consume(self,token,subject,details,now=None):
        stamp=time.time() if now is None else now
        if not isinstance(token,str) or len(token)!=97 or "." not in token:return False
        nonce,mac=token.split(".",1)
        stored=self._issued.get(nonce)
        if stored is None:return False
        expected_subject,digest,expires,used=stored
        expected=hmac.new(self._secret,(nonce+":"+expected_subject+":"+digest).encode(),hashlib.sha256).hexdigest()
        if not hmac.compare_digest(expected,mac):return False
        if used or stamp>=expires or expected_subject!=subject:return False
        if not hmac.compare_digest(digest,hashlib.sha256(details.encode()).hexdigest()):return False
        self._issued[nonce]=(expected_subject,digest,expires,True)
        return True
