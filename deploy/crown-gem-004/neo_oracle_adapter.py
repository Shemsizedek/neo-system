"""NEO Oracle adapter using the existing /api/oracle contract.
Requires explicit server configuration. Never forward browser auth cookies or Gemini tokens.
"""
import json,os,urllib.parse,urllib.request
def run(prompt,opener=None):
    endpoint=os.getenv("NEO_ORACLE_API_URL","")
    token=os.getenv("NEO_ORACLE_SERVICE_TOKEN","")
    parsed=urllib.parse.urlparse(endpoint)
    if parsed.scheme!="https" or parsed.path!="/api/oracle/private" or parsed.query or parsed.fragment or not parsed.hostname:
        raise RuntimeError("NEO Oracle endpoint not configured")
    if len(token)<32:raise RuntimeError("NEO Oracle service authorization not configured")
    if not isinstance(prompt,str) or not 1<=len(prompt.strip())<=2000:raise ValueError("invalid prompt")
    import uuid
    body={"missionId":"neo-gem-"+str(uuid.uuid4()),"objective":prompt.strip(),
          "capability":"reasoning","requestedAction":"analyze",
          "preferredProviders":["gemini"],"maxTokens":1400}
    request=urllib.request.Request(endpoint,data=json.dumps(body).encode(),method="POST",
        headers={"Content-Type":"application/json","Authorization":"Bearer "+token})
    with (opener or urllib.request.urlopen)(request,timeout=25) as response:
        raw=response.read(524289)
        code=getattr(response,"status",200)
    if len(raw)>524288:raise RuntimeError("Oracle response too large")
    if code==202:raise RuntimeError("NEO Oracle requires separate operator approval")
    if code!=200:raise RuntimeError("Oracle request failed")
    answer=json.loads(raw)
    if not isinstance(answer,dict) or not isinstance(answer.get("text"),str):
        raise RuntimeError("Oracle response is invalid")
    return {"response":{"parts":[{"text":answer["text"][:12000]}]},
            "used_tools":[],"certified":False}
