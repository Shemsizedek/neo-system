"""NSEC-018 session-security policy laboratory; NOT production login."""
import hashlib
import secrets
import sqlite3
import time

class Sessions:
    def __init__(self, path):
        self.db=sqlite3.connect(path, isolation_level=None)
        self.db.execute("PRAGMA busy_timeout=5000")
        self.db.execute("""CREATE TABLE IF NOT EXISTS sessions(
          token_hash TEXT PRIMARY KEY, owner TEXT NOT NULL,
          expires INTEGER NOT NULL, revoked INTEGER NOT NULL DEFAULT 0)""")
    @staticmethod
    def _digest(token):
        return hashlib.sha256(token.encode("utf-8")).hexdigest()
    def create_verified(self,owner,verified=False,now=None):
        # ONLY a server-side authenticated WebAuthn verifier may assert verified.
        if not verified: raise PermissionError("WebAuthn assertion not independently verified")
        if not owner: raise ValueError("missing owner")
        now=int(time.time() if now is None else now)
        token=secrets.token_urlsafe(32)
        self.db.execute("INSERT INTO sessions(token_hash,owner,expires) VALUES(?,?,?)",
                        (self._digest(token),owner,now+900))
        return token
    def check(self,token,owner,now=None):
        now=int(time.time() if now is None else now)
        row=self.db.execute("SELECT 1 FROM sessions WHERE token_hash=? AND owner=? AND expires>? AND revoked=0",
                            (self._digest(token),owner,now)).fetchone()
        return row is not None
    def revoke(self,token,owner):
        return self.db.execute("UPDATE sessions SET revoked=1 WHERE token_hash=? AND owner=? AND revoked=0",
                               (self._digest(token),owner)).rowcount==1
    def command(self,*args,**kwargs):
        raise PermissionError("remote terminal requires separately certified agent")
