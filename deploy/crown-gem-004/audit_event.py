"""Minimal security audit event schema; no secrets, user IPs or asset identifiers."""
import json
import time

ROUTES=("/v1/intelligence/bitcoin","/v1/intelligence/counterparty",
        "/v1/security/quota-readiness","/v1/gemini","/health")

def event(method, path, status, timestamp=None):
    route=next((p for p in ROUTES if path==p or path.startswith(p+"/")), "other")
    return {"schema":"crown.audit.v1","event":"crown_request",
            "method":method if method in ("GET","POST") else "OTHER",
            "route_family":route,"http_status":int(status),
            "time":int(time.time() if timestamp is None else timestamp)}

def serialized(method,path,status,timestamp=None):
    return json.dumps(event(method,path,status,timestamp),separators=(",",":"))
