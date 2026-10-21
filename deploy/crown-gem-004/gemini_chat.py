"""Authenticated, server-only Gemini chat handler; no signing or wallet actions."""
import json

def handle_chat(handler):
    size=handler.headers.get("Content-Length","")
    if not size.isdecimal() or not (1<=int(size)<=4096):
        return 400,{"error":"invalid request size"}
    try:
        payload=json.loads(handler.rfile.read(int(size)))
        if not isinstance(payload,dict):
            return 400,{"error":"invalid request"}
        message=payload.get("message")
        if not isinstance(message,str) or not (1<=len(message.strip())<=2000):
            return 400,{"error":"message must contain 1 to 2000 characters"}
        from gemini_runtime import run
        result=run(message.strip())
        response=result.get("response",{})
        text="\n".join(part["text"] for part in response.get("parts",[]) if isinstance(part,dict) and isinstance(part.get("text"),str))
        return 200,{"response":text[:12000],"tools_used":result.get("used_tools",[]),"independently_certified":False}
    except (json.JSONDecodeError,UnicodeDecodeError,ValueError,TypeError):
        return 400,{"error":"invalid JSON request"}
    except Exception:
        return 502,{"error":"Gemini runtime unavailable"}
