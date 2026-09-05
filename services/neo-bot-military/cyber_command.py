"""NEO Bot Military — Cyber Command / Account Integrity v0.1.

Standard-library-only internal service. It stores first-party/manual evidence and
computes descriptive follower-count anomalies. It contains no social-platform
mutation or fake-engagement functionality.
"""
from __future__ import annotations

import hashlib
import hmac
import json
import os
import sqlite3
import statistics
from datetime import datetime, timezone
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlparse

DB_PATH = Path(os.getenv("NEO_BOT_DB", Path(__file__).with_name("neo_bot_military.sqlite3")))
TOKEN = os.getenv("NEO_BOT_INTERNAL_TOKEN", "")

SCHEMA = """
PRAGMA journal_mode=WAL;
CREATE TABLE IF NOT EXISTS account_snapshots (
 id INTEGER PRIMARY KEY, platform TEXT NOT NULL, account TEXT NOT NULL,
 observed_at TEXT NOT NULL, followers INTEGER NOT NULL,
 views INTEGER, reach INTEGER, interactions INTEGER,
 non_follower_view_pct REAL, source TEXT NOT NULL,
 evidence_refs TEXT NOT NULL DEFAULT '[]', created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_snapshots_account_time
 ON account_snapshots(platform, account, observed_at);
CREATE TABLE IF NOT EXISTS incidents (
 id INTEGER PRIMARY KEY, incident_id TEXT NOT NULL UNIQUE,
 platform TEXT NOT NULL, account TEXT NOT NULL, observed_at TEXT NOT NULL,
 type TEXT NOT NULL, subject TEXT, evidence_class TEXT NOT NULL,
 statement TEXT NOT NULL, evidence_refs TEXT NOT NULL DEFAULT '[]',
 confidence TEXT NOT NULL DEFAULT 'unassessed', disposition TEXT NOT NULL DEFAULT 'open',
 created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_incidents_account_time
 ON incidents(platform, account, observed_at);
CREATE TABLE IF NOT EXISTS platform_restrictions (
 id INTEGER PRIMARY KEY, platform TEXT NOT NULL, account TEXT NOT NULL,
 observed_at TEXT NOT NULL, restriction TEXT NOT NULL, status TEXT NOT NULL,
 evidence_class TEXT NOT NULL, evidence_refs TEXT NOT NULL DEFAULT '[]',
 created_at TEXT NOT NULL
);
"""


def now(): return datetime.now(timezone.utc).isoformat()

def connect():
    con = sqlite3.connect(DB_PATH)
    con.row_factory = sqlite3.Row
    con.executescript(SCHEMA)
    return con

def require_fields(data, *fields):
    missing = [f for f in fields if data.get(f) in (None, "")]
    if missing: raise ValueError("missing fields: " + ", ".join(missing))

def add_snapshot(data):
    require_fields(data, "platform", "account", "observed_at", "followers", "source")
    if data["source"] not in {"manual", "official_api", "first_party_export", "operator_supplied_first_party_screenshots"}:
        raise ValueError("unsupported source")
    refs = json.dumps(data.get("evidence_refs", []))
    with connect() as con:
        cur = con.execute("""INSERT INTO account_snapshots
        (platform,account,observed_at,followers,views,reach,interactions,non_follower_view_pct,source,evidence_refs,created_at)
        VALUES (?,?,?,?,?,?,?,?,?,?,?)""", (data["platform"].lower(), data["account"].lower(), data["observed_at"], int(data["followers"]), data.get("views"), data.get("reach"), data.get("interactions"), data.get("non_follower_view_pct"), data["source"], refs, now()))
        return cur.lastrowid

def add_incident(data):
    require_fields(data, "platform", "account", "observed_at", "type", "evidence_class", "statement")
    if data["evidence_class"] not in {"firsthand_observation", "platform_record", "inference"}:
        raise ValueError("invalid evidence_class")
    seed = "|".join(str(data.get(k,"")) for k in ("platform","account","observed_at","type","subject","statement"))
    incident_id = data.get("incident_id") or hashlib.sha256(seed.encode()).hexdigest()[:20]
    with connect() as con:
        con.execute("""INSERT INTO incidents
        (incident_id,platform,account,observed_at,type,subject,evidence_class,statement,evidence_refs,confidence,disposition,created_at)
        VALUES (?,?,?,?,?,?,?,?,?,?,?,?)""", (incident_id,data["platform"].lower(),data["account"].lower(),data["observed_at"],data["type"],data.get("subject"),data["evidence_class"],data["statement"],json.dumps(data.get("evidence_refs",[])),data.get("confidence","unassessed"),data.get("disposition","open"),now()))
    return incident_id

def anomalies(platform, account, limit=90):
    with connect() as con:
        rows = con.execute("SELECT observed_at,followers FROM account_snapshots WHERE platform=? AND account=? ORDER BY observed_at DESC LIMIT ?", (platform.lower(), account.lower(), limit)).fetchall()[::-1]
    points = [dict(r) for r in rows]
    if len(points) < 3: return {"status":"insufficient_data","points":points,"minimum_points":3}
    deltas = [points[i]["followers"]-points[i-1]["followers"] for i in range(1,len(points))]
    center = statistics.median(deltas)
    mad = statistics.median(abs(x-center) for x in deltas)
    flagged=[]
    for i, delta in enumerate(deltas, 1):
        score = 0.0 if mad == 0 else 0.6745*(delta-center)/mad
        if (mad == 0 and delta != center) or abs(score) >= 3.5:
            flagged.append({"observed_at":points[i]["observed_at"],"delta":delta,"robust_z":round(score,3),"description":"statistical deviation in follower-count change; causation undetermined"})
    return {"status":"ok","points":len(points),"median_daily_delta":center,"mad":mad,"flags":flagged,"causation":"undetermined"}

class Handler(BaseHTTPRequestHandler):
    def _json(self, status, payload):
        body=json.dumps(payload).encode(); self.send_response(status); self.send_header("Content-Type","application/json"); self.send_header("Content-Length",str(len(body))); self.end_headers(); self.wfile.write(body)
    def _auth(self):
        supplied=self.headers.get("Authorization","")
        expected=f"Bearer {TOKEN}"
        return bool(TOKEN) and hmac.compare_digest(supplied, expected)
    def _body(self):
        n=int(self.headers.get("Content-Length","0")); return json.loads(self.rfile.read(n) or b"{}")
    def do_GET(self):
        if self.path == "/health": return self._json(200,{"ok":True,"service":"neo-bot-military-cyber-command","platform_writes":False})
        if not self._auth(): return self._json(401,{"error":"unauthorized"})
        p=urlparse(self.path)
        if p.path.startswith("/v1/anomalies/"):
            parts=p.path.strip("/").split("/")
            if len(parts)==4: return self._json(200,anomalies(parts[2],parts[3]))
        return self._json(404,{"error":"not_found"})
    def do_POST(self):
        if not self._auth(): return self._json(401,{"error":"unauthorized"})
        try:
            data=self._body()
            if self.path=="/v1/snapshots": return self._json(201,{"id":add_snapshot(data)})
            if self.path=="/v1/incidents": return self._json(201,{"incident_id":add_incident(data)})
            return self._json(404,{"error":"not_found"})
        except (ValueError,TypeError,json.JSONDecodeError,sqlite3.IntegrityError) as e:
            return self._json(400,{"error":str(e)})
    def log_message(self, fmt, *args): pass

def main():
    if not TOKEN: raise SystemExit("NEO_BOT_INTERNAL_TOKEN is required")
    connect().close()
    host=os.getenv("NEO_BOT_HOST","127.0.0.1"); port=int(os.getenv("NEO_BOT_PORT","8787"))
    ThreadingHTTPServer((host,port),Handler).serve_forever()

if __name__ == "__main__": main()
