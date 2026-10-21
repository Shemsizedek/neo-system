"""Read-only Gemini generateContent probe; reports status, never model text or secrets."""
import json
import os
import urllib.error
import urllib.request

def probe():
    key = os.environ.get("GEMINI_API_KEY", "")
    if not key:
        return {"ok": False, "status": "missing_credential"}
    model = os.environ.get("GEMINI_MODEL", "gemini-3.5-flash-lite")
    if model not in {"gemini-3.5-flash-lite", "gemini-3.8-flash"}:
        return {"ok": False, "status": "unsupported_model"}
    payload = json.dumps({"contents": [{"parts": [{"text": "Reply with READY."}]}],
                          "generationConfig": {"maxOutputTokens": 24}}).encode()
    request = urllib.request.Request(
        "https://generativelanguage.googleapis.com/v1beta/models/" + model + ":generateContent",
        data=payload,
        headers={"x-goog-api-key": key, "Content-Type": "application/json"},
        method="POST")
    try:
        with urllib.request.urlopen(request, timeout=20) as response:
            output = json.loads(response.read(131072))
            success = bool(output.get("candidates"))
            return {"ok": success, "status": "generation_succeeded" if success else "no_candidates", "model": model}
    except urllib.error.HTTPError as error:
        return {"ok": False, "status": "api_http_error", "http_status": error.code}
    except (OSError, ValueError):
        return {"ok": False, "status": "connection_or_format_error"}
