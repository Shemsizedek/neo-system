"""NEO Utility simulation-only interval ledger. Not suitable for billing."""
from datetime import datetime, timezone
from decimal import Decimal, InvalidOperation
import json

ALLOWED_QUALITY = {"simulated", "estimated", "measured_unverified", "revenue_verified"}

class ReadingError(ValueError):
    pass

class SimulatedLedger:
    def __init__(self):
        self._events = {}
        self._intervals = {}

    def ingest(self, reading):
        required = ("record_id", "site_id", "meter_id", "interval_start_utc",
                    "interval_end_utc", "import_kwh", "export_kwh", "quality", "source")
        if any(k not in reading for k in required):
            raise ReadingError("missing required reading field")
        if reading["quality"] not in ALLOWED_QUALITY:
            raise ReadingError("invalid quality")
        try:
            start = datetime.fromisoformat(reading["interval_start_utc"].replace("Z", "+00:00"))
            end = datetime.fromisoformat(reading["interval_end_utc"].replace("Z", "+00:00"))
        except (ValueError, AttributeError) as exc:
            raise ReadingError("invalid timestamp") from exc
        if start.tzinfo is None or end.tzinfo is None or start.utcoffset() is None or end.utcoffset() is None:
            raise ReadingError("timestamp must have a timezone")
        start, end = start.astimezone(timezone.utc), end.astimezone(timezone.utc)
        if end <= start:
            raise ReadingError("interval must have positive duration")
        for key in ("import_kwh", "export_kwh"):
            try:
                value = Decimal(str(reading[key]))
            except (InvalidOperation, ValueError) as exc:
                raise ReadingError("energy must be numeric") from exc
            if not value.is_finite() or value < 0:
                raise ReadingError("energy must be finite and nonnegative")
        if not all(isinstance(reading[k], str) and reading[k].strip() for k in ("record_id","site_id","meter_id","source")):
            raise ReadingError("invalid identifier")
        key = (reading["site_id"], reading["meter_id"], start, end)
        record_id = reading["record_id"]
        normalized = json.dumps(reading, sort_keys=True, separators=(",", ":"))
        if record_id in self._events:
            if self._events[record_id] == normalized:
                return "duplicate_ignored"
            raise ReadingError("conflicting duplicate record_id: quarantine")
        for existing_start, existing_end in self._intervals.get((reading["site_id"], reading["meter_id"]), []):
            if start < existing_end and existing_start < end:
                raise ReadingError("overlapping interval: quarantine")
        self._events[record_id] = normalized
        self._intervals.setdefault((reading["site_id"], reading["meter_id"]), []).append((start,end))
        return "accepted_simulation_only"

    def simulation_totals(self, site_id):
        imports, exports = Decimal("0"), Decimal("0")
        for raw in self._events.values():
            item = json.loads(raw)
            if item["site_id"] == site_id:
                imports += Decimal(str(item["import_kwh"]))
                exports += Decimal(str(item["export_kwh"]))
        return {"import_kwh": str(imports), "export_kwh": str(exports),
                "billing_eligible": False, "control_authorized": False}
