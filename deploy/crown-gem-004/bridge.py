"""CROWN-GEM-004: read-only, authenticated Bitcoin/Counterparty query gateway."""
import hmac
import ipaddress
import json
import os
import re
import socket
import urllib.error
import urllib.request
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import urlparse

TX = re.compile(r"^[0-9a-fA-F]{64}$")
ASSET = re.compile(r"^[A-Z][A-Z0-9.]{0,31}$")
ADDRESS = re.compile(r"^[A-Za-z0-9]{14,90}$")
LIMIT = 512000

class DenyRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, *args):
        return None

OPENER = urllib.request.build_opener(DenyRedirect)

def base_url(key):
    value = os.environ.get(key, "").rstrip("/")
    if not value:
        return None
    parsed = urlparse(value)
    hosts = {s.strip().lower() for s in os.environ.get("CROWN_ALLOWED_HOSTS", "").split(",") if s.strip()}
    if parsed.scheme != "https" or not parsed.hostname or parsed.hostname.lower() not in hosts or (parsed.port not in (None, 443) and not (key == "COUNTERPARTY_API_BASE" and parsed.hostname.lower() == "api.counterparty.io" and parsed.port == 4000)) or parsed.username or parsed.password or parsed.query or parsed.fragment:
        raise ValueError("upstream URL is not approved")
    # DNS resolution precheck is defense in depth only. Production egress must enforce public IPs independently.
    for record in socket.getaddrinfo(parsed.hostname, parsed.port or 443, type=socket.SOCK_STREAM):
        if not ipaddress.ip_address(record[4][0]).is_global:
            raise ValueError("nonpublic upstream IP")
    return value

def upstream(env, route):
    base = base_url(env)
    if not base:
        return 503, {"error":"upstream not configured"}
    req = urllib.request.Request(base + route, headers={"Accept":"application/json","User-Agent":"NEO-Crown-ReadOnly/0.4"})
    try:
        with OPENER.open(req, timeout=8) as response:
            if response.status != 200:
                return 502, {"error":"upstream failure"}
            payload = response.read(LIMIT+1)
            if len(payload) > LIMIT:
                return 502, {"error":"oversized response"}
            return 200, {"verified":False, "upstream":env, "data":json.loads(payload)}
    except (urllib.error.URLError, TimeoutError, ValueError, OSError):
        return 502, {"error":"upstream failed"}

def dispatch(path):
    if path == "/health":
        return 200, {"service":"neo-crown-gem","mode":"read-only","gemini_key_present":bool(os.getenv("GEMINI_API_KEY")), "gemini_execution_enabled":False,"configured":{k:bool(os.getenv(k)) for k in ("BITCOIN_API_BASE","COUNTERPARTY_API_BASE","CROWN_API_BASE")}}
    chunks=path.split("/")
    if len(chunks)==5 and chunks[:4]==["","v1","bitcoin","tx"] and TX.fullmatch(chunks[4]):
        return upstream("BITCOIN_API_BASE","/tx/"+chunks[4])
    if len(chunks)==5 and chunks[:4]==["","v1","counterparty","asset"] and ASSET.fullmatch(chunks[4]):
        return upstream("COUNTERPARTY_API_BASE","/assets/"+chunks[4])
    if len(chunks)==6 and chunks[:4]==["","v1","counterparty","address"] and chunks[5]=="balances" and ADDRESS.fullmatch(chunks[4]):
        return upstream("COUNTERPARTY_API_BASE","/addresses/"+chunks[4]+"/balances")
    if len(chunks)==5 and chunks[:4]==["","v1","crown","attestation"] and TX.fullmatch(chunks[4]):
        return upstream("CROWN_API_BASE","/attestations/"+chunks[4])
    return 404, {"error":"not found"}

class Handler(BaseHTTPRequestHandler):
    def respond(self,status,value):
        payload=json.dumps(value).encode()
        self.send_response(status)
        self.send_header("Content-Type","application/json")
        self.send_header("Cache-Control","no-store")
        self.send_header("X-Content-Type-Options","nosniff")
        self.send_header("Content-Length",str(len(payload)))
        self.end_headers()
        self.wfile.write(payload)
    def do_GET(self):
        token=os.environ.get("CROWN_BRIDGE_TOKEN","")
        if len(token)<32:
            return self.respond(503,{"error":"authentication not configured"})
        if not hmac.compare_digest(self.headers.get("Authorization",""),"Bearer "+token):
            return self.respond(401,{"error":"unauthorized"})
        if "?" in self.path or "#" in self.path:
            return self.respond(400,{"error":"query parameters not supported"})
        try:
            status,data=dispatch(self.path)
        except ValueError:
            status,data=503,{"error":"invalid upstream configuration"}
        return self.respond(status,data)
    def do_POST(self):
        token=os.environ.get("CROWN_BRIDGE_TOKEN","")
        if len(token)<32:
            return self.respond(503,{"error":"authentication not configured"})
        if not hmac.compare_digest(self.headers.get("Authorization",""),"Bearer "+token):
            return self.respond(401,{"error":"unauthorized"})
        if self.path != "/v1/gemini/verify":
            return self.respond(405,{"error":"read-only"})
        if self.headers.get("Content-Length","0") not in ("","0"):
            return self.respond(400,{"error":"request body prohibited"})
        from verify_gemini import verify
        result=verify()
        return self.respond(200 if result.get("ok") else 502,result)
    do_PUT=do_POST
    do_PATCH=do_POST
    do_DELETE=do_POST

if __name__=="__main__":
    ThreadingHTTPServer(("0.0.0.0",int(os.environ.get("PORT","8080"))),Handler).serve_forever()
