"""GEM-124: operator-only, bounded provider connectivity probes; never reveal secrets."""
import os
def diagnose(provider,probe=None):
    if provider!="openai":return {"provider":provider,"verified":False,"reason":"unsupported"}
    if not (os.getenv("NEO_OPENAI_API_KEY") and os.getenv("NEO_OPENAI_MODEL")):
        return {"provider":"openai","verified":False,"reason":"not_configured"}
    try:
        if probe is None:
            from neo_openai_adapter import run
            result=run("Reply with NEO-OK only.")
        else:result=probe()
        parts=result.get("response",{}).get("parts",[])
        valid=any(isinstance(p,dict) and isinstance(p.get("text"),str) and p["text"].strip() for p in parts)
        return {"provider":"openai","verified":bool(valid),"reason":"ok" if valid else "empty_response"}
    except Exception:
        return {"provider":"openai","verified":False,"reason":"request_failed"}
