"""GEM-098: durable local SQLite one-shot approvals, staging/reference only.
Production requires independently operated persistent storage and authenticated
Google-sub-bound session integration; no HTTP route or GitHub write is mounted.
"""
import hashlib,hmac,sqlite3,time,secrets

class DurableApprovalStore:
    def __init__(self,db_path,secret):
        if not isinstance(secret,bytes) or len(secret)<32:raise ValueError("secret required")
        self.secret=secret;self.db_path=db_path
        with self._db() as db:
            db.execute("CREATE TABLE IF NOT EXISTS approvals (nonce TEXT PRIMARY KEY, subject TEXT NOT NULL, digest TEXT NOT NULL, expires REAL NOT NULL, consumed INTEGER NOT NULL DEFAULT 0)")
    def _db(self):
        conn=sqlite3.connect(self.db_path,timeout=10,isolation_level=None)
        conn.execute("PRAGMA busy_timeout=10000")
        return conn
    def issue(self,subject,details,verified_subject,now=None):
        if not isinstance(subject,str) or not subject or subject!=verified_subject:
            raise PermissionError("verified Google subject required")
        stamp=time.time() if now is None else now
        nonce=secrets.token_hex(16);digest=hashlib.sha256(details.encode()).hexdigest()
        mac=hmac.new(self.secret,(nonce+":"+subject+":"+digest).encode(),hashlib.sha256).hexdigest()
        with self._db() as db:
            db.execute("INSERT INTO approvals(nonce,subject,digest,expires) VALUES(?,?,?,?)",(nonce,subject,digest,stamp+180))
        return nonce+"."+mac
    def consume(self,token,subject,details,verified_subject,now=None):
        if subject!=verified_subject or not isinstance(token,str) or len(token)!=97:return False
        try:nonce,mac=token.split(".")
        except ValueError:return False
        digest=hashlib.sha256(details.encode()).hexdigest()
        expected=hmac.new(self.secret,(nonce+":"+subject+":"+digest).encode(),hashlib.sha256).hexdigest()
        if not hmac.compare_digest(mac,expected):return False
        stamp=time.time() if now is None else now
        with self._db() as db:
            cur=db.execute("UPDATE approvals SET consumed=1 WHERE nonce=? AND subject=? AND digest=? AND expires>? AND consumed=0",(nonce,subject,digest,stamp))
            return cur.rowcount==1
