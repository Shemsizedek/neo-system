"""Gemini developer API runtime for NEO Crown, explicitly opt-in and read-only.

Environment: GEMINI_API_KEY, CROWN_BRIDGE_URL, CROWN_BRIDGE_TOKEN, optional GEMINI_MODEL.
Never put secrets in Gem instructions. Not a consumer Gems/Skills connector.
"""
import json
import os
import sys
import urllib.request
import urllib.parse

from gemini_adapter import TOOL_DECLARATIONS, call_crown_tool

MODEL = os.getenv("GEMINI_MODEL", "gemini-3.5-flash-lite")
API_KEY = os.getenv("GEMINI_API_KEY", "")

def generate(contents, tools=True):
    if not API_KEY or not MODEL.startswith("gemini-"):
        raise RuntimeError("Gemini developer API credentials/model not configured")
    body = {
        "contents": contents,
        "systemInstruction": {"parts":[{"text":"You are the NEO Crown read-only blockchain verification assistant. Do not invent transaction or asset findings; acknowledge missing or incomplete evidence. Never claim signing or settlement capabilities."}]},
    }
    if tools:
        body["tools"] = [{"functionDeclarations": TOOL_DECLARATIONS}]
    req = urllib.request.Request(
        "https://generativelanguage.googleapis.com/v1beta/models/" + urllib.parse.quote(MODEL, safe="-_.") + ":generateContent",
        data=json.dumps(body).encode(),
        headers={"Content-Type":"application/json", "x-goog-api-key":API_KEY},
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=30) as response:
        data = response.read(1024*1024+1)
        if len(data)>1024*1024: raise RuntimeError("Gemini response too large")
        return json.loads(data)

def run(prompt):
    contents=[{"role":"user","parts":[{"text":prompt}]}]
    first=generate(contents)
    candidates=first.get("candidates") or []
    if not candidates: raise RuntimeError("No Gemini response candidates")
    model_content=candidates[0].get("content",{})
    calls=[p["functionCall"] for p in model_content.get("parts",[]) if "functionCall" in p]
    if not calls:
        return {"used_tools":[], "response":model_content, "certified":False}
    if len(calls)>2: raise RuntimeError("Tool call limit exceeded")
    contents.append(model_content)
    responses=[]
    names=[]
    evidence=[]
    for call in calls:
        name=call.get("name","")
        if name not in {x["name"] for x in TOOL_DECLARATIONS}:
            raise RuntimeError("Unapproved function call")
        names.append(name)
        result=call_crown_tool(name,call.get("args",{}))
        record=result.get("data") if isinstance(result,dict) else None
        requested=call.get("args",{}).get("asset")
        identity_match=(
            name=="neo_crown_counterparty_asset" and isinstance(requested,str) and
            (isinstance(record,dict) and (record.get("asset")==requested or
             isinstance(record.get("result"),dict) and record["result"].get("asset")==requested))
        )
        evidence.append({"tool":name,"asset_identity_match":bool(identity_match),
                         "independent_verification":False})
        response={"name":name,"response":{"result":result}}
        if call.get("id"):
            response["id"]=call["id"]
        responses.append({"functionResponse":response})
    contents.append({"role":"user","parts":responses})
    final=generate(contents,tools=False)
    return {"used_tools":names,"tool_evidence":evidence,"response":(final.get("candidates") or [{}])[0].get("content",{}),"certified":False}

if __name__=="__main__":
    if len(sys.argv)!=2 or not sys.argv[1].strip():
        raise SystemExit("Usage: python gemini_runtime.py 'Look up public Counterparty asset XCP'")
    output=run(sys.argv[1])
    # Never print credentials; response data is public only.
    print(json.dumps(output,indent=2)[:12000])
