"""NEO Gemini authenticated client. Tokens stay in private environment variables."""
import json
import os
import urllib.request
import urllib.parse

def ask(message, base_url=None, token=None, timeout=70):
    base_url=(base_url or os.environ.get("CROWN_BRIDGE_URL","")).rstrip("/")
    token=token or os.environ.get("CROWN_BRIDGE_TOKEN","")
    if not base_url.startswith("https://") or urllib.parse.urlparse(base_url).hostname is None:
        raise ValueError("HTTPS bridge URL required")
    if len(token)<32 or not isinstance(message,str) or not 1<=len(message.strip())<=2000:
        raise ValueError("Invalid credentials or message")
    payload=json.dumps({"message":message.strip()}).encode()
    req=urllib.request.Request(base_url+"/v1/gemini/chat",data=payload,headers={
        "Authorization":"Bearer "+token,"Content-Type":"application/json","Accept":"application/json"
    },method="POST")
    with urllib.request.urlopen(req,timeout=timeout) as res:
        result=json.load(res)
    if not isinstance(result,dict) or not isinstance(result.get("response"),str):
        raise ValueError("Invalid Gemini bridge response")
    return {"response":result["response"],"tools_used":result.get("tools_used",[]),
            "independently_certified":False}

if __name__=="__main__":
    import sys
    if len(sys.argv)!=2: raise SystemExit("Usage: python gemini_client.py 'Look up Counterparty asset XCP'")
    response=ask(sys.argv[1])
    print(json.dumps(response,indent=2)[:12000])
