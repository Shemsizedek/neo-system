"""GEM-103 approval confirmation gate, staging only, no HTTP route or GitHub execution.
Requires server-trusted Google identity and explicit confirmation of the exact digest.
"""
import hashlib,hmac,json,secrets,sqlite3,time

class ConfirmationGate:
    def __init__(self,path):
        self.path=path
        with sqlite3.connect(path) as db:
            db.execute("CREATE TABLE IF NOT EXISTS confirmations (nonce TEXT PRIMARY KEY, subject TEXT NOT NULL, digest TEXT NOT NULL, csrf_hash TEXT NOT NULL, expires REAL NOT NULL, consumed INTEGER NOT NULL DEFAULT 0)")
            db.execute("CREATE TABLE IF NOT EXISTS approval_audit (event_id TEXT PRIMARY KEY, nonce TEXT NOT NULL, event TEXT NOT NULL, at REAL NOT NULL)")
    def stage(self,verified_subject,canonical_request,now=None):
        if not isinstance(verified_subject,str) or not verified_subject:raise PermissionError("authenticated identity required")
        if not isinstance(canonical_request,str) or not canonical_request:raise ValueError("request")
        timestamp=time.time() if now is None else now
        nonce=secrets.token_hex(16);csrf=secrets.token_urlsafe(32)
        digest=hashlib.sha256(canonical_request.encode()).hexdigest()
        with sqlite3.connect(self.path) as db:
            db.execute("INSERT INTO confirmations VALUES(?,?,?,?,?,0)",(nonce,verified_subject,digest,hashlib.sha256(csrf.encode()).hexdigest(),timestamp+180))
            db.execute("INSERT INTO approval_audit VALUES(?,?,?,?)",(secrets.token_hex(16),nonce,"staged",timestamp))
        return {"nonce":nonce,"csrf_token":csrf,"digest":digest,"expires_at":timestamp+180}
    def confirm(self,verified_subject,nonce,csrf_token,canonical_request,explicit_digest,now=None):
        timestamp=time.time() if now is None else now
        if not all(isinstance(x,str) for x in (verified_subject,nonce,csrf_token,canonical_request,explicit_digest)):return False
        digest=hashlib.sha256(canonical_request.encode()).hexdigest()
        if not hmac.compare_digest(digest,explicit_digest):return False
        csrf_hash=hashlib.sha256(csrf_token.encode()).hexdigest()
        with sqlite3.connect(self.path,timeout=10) as db:
            updated=db.execute("UPDATE confirmations SET consumed=1 WHERE nonce=? AND subject=? AND digest=? AND csrf_hash=? AND expires>? AND consumed=0",(nonce,verified_subject,digest,csrf_hash,timestamp))
            if updated.rowcount!=1:return False
            db.execute("INSERT INTO approval_audit VALUES(?,?,?,?)",(secrets.token_hex(16),nonce,"confirmed",timestamp))
            return True
