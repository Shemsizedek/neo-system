"""NES-014 local SQLite simulation event store; NOT utility billing."""
import json
import sqlite3
from datetime import datetime, timezone
from decimal import Decimal, InvalidOperation

class LedgerError(ValueError):
    pass

def _timestamp(value):
    try:
        d = datetime.fromisoformat(value.replace("Z", "+00:00"))
        if d.tzinfo is None or d.utcoffset() is None:
            raise ValueError()
        return d.astimezone(timezone.utc).isoformat()
    except (ValueError, AttributeError) as exc:
        raise LedgerError("invalid UTC interval timestamp") from exc

def _energy(value):
    try:
        d=Decimal(str(value))
    except (ValueError, InvalidOperation) as exc:
        raise LedgerError("invalid energy") from exc
    if not d.is_finite() or d < 0:
        raise LedgerError("energy must be finite and nonnegative")
    return str(d)

class SimulationStore:
    def __init__(self, database):
        self.db=sqlite3.connect(database)
        self.db.execute("PRAGMA foreign_keys=ON")
        self.db.execute("""CREATE TABLE IF NOT EXISTS readings (
            record_id TEXT PRIMARY KEY, site_id TEXT NOT NULL,
            meter_id TEXT NOT NULL, start_utc TEXT NOT NULL,
            end_utc TEXT NOT NULL, import_kwh TEXT NOT NULL,
            export_kwh TEXT NOT NULL, payload TEXT NOT NULL,
            UNIQUE(site_id,meter_id,start_utc,end_utc))""")
        self.db.commit()

    def close(self):
        self.db.close()

    def ingest(self, event):
        fields=("record_id","site_id","meter_id","interval_start_utc",
                "interval_end_utc","import_kwh","export_kwh","quality","source")
        if not isinstance(event,dict) or any(k not in event for k in fields):
            raise LedgerError("missing required event fields")
        for key in ("record_id","site_id","meter_id","source"):
            if not isinstance(event[key],str) or not event[key].strip():
                raise LedgerError("invalid identity field")
        if event["quality"] != "simulated":
            raise LedgerError("only simulated data permitted")
        start,end=_timestamp(event["interval_start_utc"]),_timestamp(event["interval_end_utc"])
        if end <= start:
            raise LedgerError("invalid interval")
        imp,exp=_energy(event["import_kwh"]),_energy(event["export_kwh"])
        normalized=dict(event)
        normalized["interval_start_utc"]=start
        normalized["interval_end_utc"]=end
        normalized["import_kwh"]=imp
        normalized["export_kwh"]=exp
        serialized=json.dumps(normalized,sort_keys=True,separators=(",",":"))
        existing=self.db.execute("SELECT payload FROM readings WHERE record_id=?",(event["record_id"],)).fetchone()
        if existing:
            if existing[0] == serialized:
                return "duplicate_ignored"
            raise LedgerError("conflicting duplicate")
        overlaps=self.db.execute("""SELECT 1 FROM readings
            WHERE site_id=? AND meter_id=? AND start_utc<? AND end_utc>? LIMIT 1""",
            (event["site_id"],event["meter_id"],end,start)).fetchone()
        if overlaps:
            raise LedgerError("overlapping interval")
        try:
            with self.db:
                self.db.execute("""INSERT INTO readings
                (record_id,site_id,meter_id,start_utc,end_utc,import_kwh,export_kwh,payload)
                VALUES (?,?,?,?,?,?,?,?)""",(event["record_id"],event["site_id"],event["meter_id"],
                                      start,end,imp,exp,serialized))
        except sqlite3.IntegrityError as exc:
            raise LedgerError("conflicting/duplicate event") from exc
        return "accepted_simulation_only"

    def totals(self, site_id):
        # Site filtering must additionally be protected by authenticated API authorization.
        rows=self.db.execute("SELECT import_kwh,export_kwh FROM readings WHERE site_id=?",(site_id,)).fetchall()
        imp=sum((Decimal(r[0]) for r in rows),Decimal(0))
        exp=sum((Decimal(r[1]) for r in rows),Decimal(0))
        return {"site_id":site_id,"import_kwh":str(imp),"export_kwh":str(exp),
                "record_count":len(rows),"status":"SIMULATION_ONLY",
                "billing_eligible":False,"dispatch_enabled":False}
