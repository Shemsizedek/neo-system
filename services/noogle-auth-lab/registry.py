"""NSEC-017 persistent challenge and device-enrollment laboratory. NOT a WebAuthn server."""
import sqlite3, secrets, time

class Registry:
    def __init__(self,path):
        self.db=sqlite3.connect(path,isolation_level=None)
        self.db.execute("PRAGMA busy_timeout=5000")
        self.db.execute("CREATE TABLE IF NOT EXISTS challenges(token TEXT PRIMARY KEY, owner TEXT NOT NULL, purpose TEXT NOT NULL, expires INTEGER NOT NULL, used INTEGER NOT NULL DEFAULT 0)")
        self.db.execute("CREATE TABLE IF NOT EXISTS devices(id TEXT PRIMARY KEY, owner TEXT NOT NULL, public_key TEXT NOT NULL, revoked INTEGER NOT NULL DEFAULT 0)")
    def issue(self,owner,purpose,now=None):
        if not owner or purpose not in ("enroll","authenticate"): raise ValueError("invalid scope")
        now=int(time.time() if now is None else now)
        token=secrets.token_urlsafe(32)
        self.db.execute("INSERT INTO challenges(token,owner,purpose,expires) VALUES(?,?,?,?)",(token,owner,purpose,now+120))
        return token
    def consume(self,token,owner,purpose,now=None):
        now=int(time.time() if now is None else now)
        return self.db.execute("UPDATE challenges SET used=1 WHERE token=? AND owner=? AND purpose=? AND used=0 AND expires>?",(token,owner,purpose,now)).rowcount==1
    def enroll_verified(self,owner,device_id,public_key,verified=False):
        if not verified: raise PermissionError("external authenticator proof required")
        if not all((owner,device_id,public_key)): raise ValueError("missing attribute")
        self.db.execute("INSERT INTO devices(id,owner,public_key) VALUES(?,?,?)",(device_id,owner,public_key))
    def revoke(self,owner,device_id,reverified=False):
        if not reverified: raise PermissionError("fresh reauthentication required")
        return self.db.execute("UPDATE devices SET revoked=1 WHERE id=? AND owner=? AND revoked=0",(device_id,owner)).rowcount==1
    def active(self,owner,device_id):
        return self.db.execute("SELECT 1 FROM devices WHERE owner=? AND id=? AND revoked=0",(owner,device_id)).fetchone() is not None
    def terminal(self,*a,**kw): raise PermissionError("terminal agent disabled")
