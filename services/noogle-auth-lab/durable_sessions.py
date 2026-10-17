"""NSEC-027 durable, revokeable enrollment sessions; NOT an HTTP authentication service."""
import hashlib
import secrets
import sqlite3
import time

class DurableEnrollmentSessions:
    def __init__(self, path, ttl=300):
        if ttl < 1 or ttl > 300: raise ValueError("TTL must be 1..300 seconds")
        self.ttl=ttl
        self.conn=sqlite3.connect(path,isolation_level=None,timeout=5)
        self.conn.execute("PRAGMA busy_timeout=5000")
        self.conn.execute("CREATE TABLE IF NOT EXISTS enrollment_sessions (id_hash TEXT PRIMARY KEY, csrf_hash TEXT NOT NULL, owner TEXT NOT NULL, expires INTEGER NOT NULL, revoked INTEGER NOT NULL DEFAULT 0)")
    @staticmethod
    def _digest(value):
        if not isinstance(value,str) or not value: return ""
        return hashlib.sha256(value.encode()).hexdigest()
    def issue_verified(self,owner,proof=None,now=None):
        """Only a trusted server-side verifier may supply a nonempty opaque proof object."""
        if not owner or proof is None or not getattr(proof,"validated",False):
            raise PermissionError("verified fresh NEO Pass proof required")
        now=int(time.time() if now is None else now)
        identifier=secrets.token_urlsafe(32)
        csrf=secrets.token_urlsafe(32)
        self.conn.execute("INSERT INTO enrollment_sessions(id_hash,csrf_hash,owner,expires) VALUES (?,?,?,?)",
                          (self._digest(identifier),self._digest(csrf),owner,now+self.ttl))
        return identifier,csrf
    def authorize(self,identifier,csrf,owner,now=None):
        now=int(time.time() if now is None else now)
        return self.conn.execute(
          "SELECT 1 FROM enrollment_sessions WHERE id_hash=? AND csrf_hash=? AND owner=? AND expires>? AND revoked=0",
          (self._digest(identifier),self._digest(csrf),owner,now)).fetchone() is not None
    def revoke(self,identifier,owner):
        return self.conn.execute(
          "UPDATE enrollment_sessions SET revoked=1 WHERE id_hash=? AND owner=? AND revoked=0",
          (self._digest(identifier),owner)).rowcount==1
    def terminal(self,*args,**kwargs):
        raise PermissionError("remote terminal disabled")

# Demonstration proof sentinel: no production caller should accept validated from a client.
