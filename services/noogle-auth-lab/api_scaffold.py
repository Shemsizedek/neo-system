"""NSEC-021 explicit fail-closed Guardian WSGI API scaffold.
No credentials, remote terminal access or actual enrollment are exposed.
"""
import json

HEALTH = {"service":"neo-guardian","status":"ok","mode":"preproduction"}
STATUS = {"service":"neo-guardian","webauthn":"not_enabled","device_enrollment":"not_enabled","remote_terminal":"disabled"}

def application(environ,start_response):
    method=environ.get("REQUEST_METHOD","GET").upper()
    path=environ.get("PATH_INFO","/")
    if method=="GET" and path=="/api/guardian/health":
        status,data="200 OK",HEALTH
    elif method=="GET" and path=="/api/guardian/capabilities":
        status,data="200 OK",STATUS
    elif path.startswith("/api/guardian/"):
        status,data="403 Forbidden",{"error":"not_enabled","message":"Authenticated NEO Pass backend not deployed"}
    else:
        status,data="404 Not Found",{"error":"not_found"}
    payload=json.dumps(data,separators=(",",":")).encode("utf-8")
    start_response(status,[("Content-Type","application/json"),("Content-Length",str(len(payload))),("Cache-Control","no-store"),("X-Content-Type-Options","nosniff")])
    return [payload]
