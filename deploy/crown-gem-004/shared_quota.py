"""Shared staging rate limit using an injected Redis/Valkey-compatible client.

The caller must configure an authenticated private network client. This module
does not connect by itself and does not fall back to local memory on failure.
"""
import hashlib

SCRIPT = """
local count = redis.call('INCR', KEYS[1])
if count == 1 then redis.call('EXPIRE', KEYS[1], ARGV[1]) end
if count > tonumber(ARGV[2]) then return 0 else return 1 end
"""

def allowed(redis_client, principal, limit=30, window=60):
    if not isinstance(principal, str) or not principal or redis_client is None:
        return False
    identifier = hashlib.sha256(principal.encode('utf-8')).hexdigest()
    try:
        response = redis_client.eval(SCRIPT, 1, "crown:quota:" + identifier, window, limit)
        return response == 1
    except Exception:
        # Fail closed: a missing quota backend must never silently disable limits.
        return False
