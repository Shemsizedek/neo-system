"""One-shot Gemini API credential verification. No credential is printed or transmitted except to Google.
Run only in the trusted runtime with GEMINI_API_KEY configured. May consume Gemini API quota.
"""
import json
import os
import sys
import urllib.error
import urllib.request

def verify(api_key=None, opener=None):
    key = api_key if api_key is not None else os.environ.get("GEMINI_API_KEY", "")
    if not key:
        return {"ok": False, "status": "missing_credential"}
    request = urllib.request.Request(
        "https://generativelanguage.googleapis.com/v1beta/models",
        headers={"x-goog-api-key": key, "Accept": "application/json"},
        method="GET",
    )
    transport = opener or urllib.request.urlopen
    try:
        with transport(request, timeout=15) as response:
            data = response.read(262145)
            if len(data) > 262144:
                return {"ok":False,"status":"oversized_response"}
            parsed = json.loads(data)
            models = parsed.get("models", [])
            return {"ok": isinstance(models, list), "status": "authenticated" if isinstance(models,list) else "unexpected_response", "models_returned": len(models) if isinstance(models,list) else 0}
    except urllib.error.HTTPError as err:
        return {"ok":False,"status":"http_error","http_status":err.code}
    except (urllib.error.URLError, OSError, ValueError, json.JSONDecodeError):
        return {"ok":False,"status":"transport_error"}

if __name__ == "__main__":
    result=verify()
    print(json.dumps(result))
    sys.exit(0 if result["ok"] else 1)
