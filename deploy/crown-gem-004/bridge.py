"""CROWN-GEM-004: read-only, authenticated Bitcoin/Counterparty query gateway."""
import hmac
import ipaddress
import json
import os
import re
import socket
import time
import threading
import urllib.error
import urllib.request
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import urlparse

TX = re.compile(r"^[0-9a-fA-F]{64}$")
ASSET = re.compile(r"^[A-Z][A-Z0-9.]{0,31}$")
ADDRESS = re.compile(r"^[A-Za-z0-9]{14,90}$")
LIMIT = 512000
RATE_LOCK = threading.Lock()
RATE_STATE = {}

def rate_allowed(peer, now=None):
    now = time.monotonic() if now is None else now
    with RATE_LOCK:
        # Bound memory under many distinct clients. Deny new peers at capacity.
        expired = [key for key, value in RATE_STATE.items() if now - value[0] >= 60]
        for key in expired:
            del RATE_STATE[key]
        if peer not in RATE_STATE and len(RATE_STATE) >= 4096:
            return False
        start, count = RATE_STATE.get(peer, (now, 0))
        if count >= 30:
            return False
        RATE_STATE[peer] = (start, count + 1)
        return True


def quota_allowed(peer):
    """Opt-in shared quota mode; never fall back to local counters on error."""
    if os.environ.get("CROWN_SHARED_QUOTA_ENABLED") != "1":
        return rate_allowed(peer)
    import shared_quota
    try:
        import redis
        address = os.environ.get("CROWN_VALKEY_URL", "")
        if not address.startswith(("redis://", "rediss://")):
            return False
        client = redis.Redis.from_url(address, socket_connect_timeout=2, socket_timeout=2)
        return shared_quota.allowed(client, peer)
    except Exception:
        return False

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
    if path == "/v1/security/quota-readiness":
        from valkey_preflight import check
        result = check()
        return (200 if result.get("ok") else 503), result
    if path == "/health":
        return 200, {"service":"neo-crown-gem","mode":"read-only","gemini_key_present":bool(os.getenv("GEMINI_API_KEY")), "gemini_execution_enabled":False,"configured":{k:bool(os.getenv(k)) for k in ("BITCOIN_API_BASE","COUNTERPARTY_API_BASE","CROWN_API_BASE")}}
    # Unified public-evidence interface; downstream API records are not independent certification.
    if path.startswith("/v1/intelligence/"):
        parts=path.split("/")
        if len(parts)!=5:
            return 404, {"error":"not found"}
        kind, identifier=parts[3],parts[4]
        if kind=="bitcoin" and TX.fullmatch(identifier):
            code, result=upstream("BITCOIN_API_BASE","/tx/"+identifier)
            record=result.get("data")
            matches=code==200 and isinstance(record,dict) and record.get("txid","").lower()==identifier.lower()
        elif kind=="counterparty" and ASSET.fullmatch(identifier):
            code, result=upstream("COUNTERPARTY_API_BASE","/assets/"+identifier)
            record=result.get("data")
            matches=code==200 and (isinstance(record,dict) and (record.get("asset")==identifier or isinstance(record.get("result"),dict) and record["result"].get("asset")==identifier) or isinstance(record,list) and any(isinstance(v,dict) and v.get("asset")==identifier for v in record))
        else:
            return 400, {"error":"invalid identifier or network"}
        if code!=200:
            return code, {"ok":False,"source":kind,"verified":False,"error":result.get("error","upstream unavailable")}
        return 200, {"ok":matches,"source":kind,"requested_identifier":identifier,"identity_match":matches,"independently_certified":False,"verified":False,"data":record}
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
        from audit_event import serialized
        print(serialized(self.command, self.path, status), flush=True)
        payload=json.dumps(value).encode()
        self.send_response(status)
        self.send_header("Content-Type","application/json")
        self.send_header("Cache-Control","no-store")
        self.send_header("X-Content-Type-Options","nosniff")
        self.send_header("Content-Length",str(len(payload)))
        self.end_headers()
        self.wfile.write(payload)
    def do_GET(self):
        if getattr(self,"path","") == "/gemini":
            from gemini_private_web import get
            return get(self)
        if not quota_allowed(self.client_address[0]):
            return self.respond(429, {"error":"rate limited"})
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
        if self.path in ("/gemini/google","/gemini/ask","/gemini/logout"):
            if not quota_allowed(self.client_address[0]):
                return self.respond(429,{"error":"rate limited"})
            from gemini_private_web import post
            return post(self)
        if not quota_allowed(self.client_address[0]):
            return self.respond(429, {"error":"rate limited"})
        token=os.environ.get("CROWN_BRIDGE_TOKEN","")
        if len(token)<32:
            return self.respond(503,{"error":"authentication not configured"})
        if not hmac.compare_digest(self.headers.get("Authorization",""),"Bearer "+token):
            return self.respond(401,{"error":"unauthorized"})
        if self.path == "/v1/gemini/probe":
            if self.headers.get("Content-Length","0") not in ("","0"):
                return self.respond(400,{"error":"request body prohibited"})
            from probe_gemini import probe
            outcome=probe()
            return self.respond(200 if outcome.get("ok") else 502,outcome)
        if self.path == "/v1/gemini/chat":
            from gemini_chat import handle_chat
            status,body=handle_chat(self)
            return self.respond(status,body)
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
    if os.environ.get("CROWN_VERIFY_GEMINI_ON_BOOT") == "1":
        from verify_gemini import verify
        outcome = verify()
        print("CROWN_GEMINI_AUTH_CHECK " + json.dumps(outcome), flush=True)
    if os.environ.get("CROWN_PROBE_GEMINI_ON_BOOT") == "1":
        from probe_gemini import probe
        print("CROWN_GEMINI_GENERATION_CHECK " + json.dumps(probe()), flush=True)
    if os.environ.get("CROWN_VERIFY_XCP_ON_BOOT") == "1":
        try:
            status, result = dispatch("/v1/counterparty/asset/XCP")
            record = result.get("data")
            if isinstance(record, list):
                matches = any(isinstance(item, dict) and item.get("asset") == "XCP" for item in record)
            else:
                matches = isinstance(record, dict) and (
                    record.get("asset") == "XCP" or
                    isinstance(record.get("result"), dict) and record["result"].get("asset") == "XCP"
                )
            print("CROWN_XCP_LOOKUP_CHECK " + json.dumps({"http_status":status, "asset_identity_verified":bool(status == 200 and matches)}), flush=True)
        except (ValueError, OSError) as error:
            print("CROWN_XCP_LOOKUP_CHECK " + json.dumps({"ok":False,"status":"upstream_config_or_network_error"}), flush=True)
    if os.environ.get("CROWN_GEMINI_TOOL_ON_BOOT") == "1":
        try:
            from gemini_runtime import run
            result = run("Use the neo_crown_counterparty_asset tool to look up XCP. Do not guess.")
            names = result.get("used_tools", [])
            print("CROWN_GEMINI_TOOL_CHECK " + json.dumps({"ok":"neo_crown_counterparty_asset" in names,"tool_called":"neo_crown_counterparty_asset" in names}), flush=True)
        except Exception as error:
            print("CROWN_GEMINI_TOOL_CHECK " + json.dumps({"ok":False,"error_type":type(error).__name__}), flush=True)
    if os.environ.get("CROWN_BTC_SMOKE_ON_BOOT") == "1":
        sample = "4a5e1e4baab89f3a32518a88c31bc87f618f76673e2cc77ab2127b7afdeda33b"
        status, record = dispatch("/v1/bitcoin/tx/" + sample)
        payload = record.get("data")
        ok = status == 200 and isinstance(payload, dict) and payload.get("txid", "").lower() == sample
        print("CROWN_BTC_SMOKE " + json.dumps({"http_status":status, "txid_match":ok}), flush=True)
    if os.environ.get("CROWN_GEMINI_BTC_ON_BOOT") == "1":
        try:
            from gemini_runtime import run
            out = run("Use neo_crown_bitcoin_transaction to retrieve Bitcoin transaction 4a5e1e4baab89f3a32518a88c31bc87f618f76673e2cc77ab2127b7afdeda33b.")
            names = out.get("used_tools", [])
            print("CROWN_GEMINI_BTC_CHECK " + json.dumps({"tool_called":"neo_crown_bitcoin_transaction" in names}), flush=True)
        except Exception as err:
            print("CROWN_GEMINI_BTC_CHECK " + json.dumps({"ok":False,"error_type":type(err).__name__}), flush=True)
    if os.environ.get("CROWN_UNIFIED_SMOKE_ON_BOOT") == "1":
        samples = [
            ("bitcoin", "4a5e1e4baab89f3a32518a88c31bc87f618f76673e2cc77ab2127b7afdeda33b"),
            ("counterparty", "XCP"),
        ]
        for network, identifier in samples:
            try:
                code, outcome = dispatch("/v1/intelligence/" + network + "/" + identifier)
                print("CROWN_UNIFIED_SMOKE " + json.dumps({"network":network,"http_status":code,"identity_match":outcome.get("identity_match") is True,"independently_certified":outcome.get("independently_certified") is True}), flush=True)
            except (ValueError, OSError):
                print("CROWN_UNIFIED_SMOKE " + json.dumps({"network":network,"status":"network_or_configuration_error"}), flush=True)
    if os.environ.get("CROWN_VALKEY_PREFLIGHT_ON_BOOT") == "1":
        from valkey_preflight import check
        print("CROWN_VALKEY_PREFLIGHT " + json.dumps(check()), flush=True)
    server=ThreadingHTTPServer(("0.0.0.0",int(os.environ.get("PORT","8080"))),Handler)
    if os.environ.get("CROWN_GEMINI_POSTSTART_DIAGNOSTIC") == "1":
        def poststart_diagnostic():
            time.sleep(2)
            from gemini_diagnostic import main
            main()
        threading.Thread(target=poststart_diagnostic,daemon=True,name="gemini-one-shot-diagnostic").start()
    server.serve_forever()
