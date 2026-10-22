"""GEM-121: OpenAI Responses API text-only adapter. No NEO tool execution."""
import json,os,urllib.request
def run(prompt,opener=None):
    key=os.getenv("NEO_OPENAI_API_KEY","")
    model=os.getenv("NEO_OPENAI_MODEL","")
    if not key or not model:raise RuntimeError("OpenAI runtime not configured")
    if not isinstance(prompt,str) or not 1<=len(prompt.strip())<=2000:raise ValueError("invalid prompt")
    data=json.dumps({"model":model,"input":prompt.strip(),"store":False}).encode()
    req=urllib.request.Request("https://api.openai.com/v1/responses",data=data,method="POST",
         headers={"Authorization":"Bearer "+key,"Content-Type":"application/json"})
    open_fn=opener or urllib.request.urlopen
    with open_fn(req,timeout=30) as response:
        raw=response.read(524289)
    if len(raw)>524288:raise RuntimeError("response too large")
    body=json.loads(raw)
    parts=[]
    for item in body.get("output",[]):
        if isinstance(item,dict) and item.get("type")=="message":
            for part in item.get("content",[]):
                if isinstance(part,dict) and part.get("type")=="output_text":
                    parts.append(str(part.get("text","")))
    return {"response":{"parts":[{"text":"\\n".join(parts)[:12000]}]},"used_tools":[],"certified":False}
