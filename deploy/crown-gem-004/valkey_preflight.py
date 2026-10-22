"""Read-only secret-safe Valkey quota connectivity preflight."""
import os
import sys
import json

def check(client=None):
    address = os.environ.get("CROWN_VALKEY_URL", "")
    if not address.startswith(("redis://", "rediss://")):
        return {"ok":False,"reason":"private_url_missing"}
    try:
        if client is None:
            import redis
            client=redis.Redis.from_url(address, socket_connect_timeout=2, socket_timeout=2)
        if not client.ping():
            return {"ok":False,"reason":"ping_failed"}
        from shared_quota import allowed
        if not allowed(client,"staging-preflight",limit=3,window=60):
            return {"ok":False,"reason":"quota_failed"}
        return {"ok":True,"reason":"private_quota_operational"}
    except Exception:
        return {"ok":False,"reason":"connection_or_dependency_failure"}

if __name__=="__main__":
    result=check()
    print(json.dumps(result))
    sys.exit(0 if result["ok"] else 1)
