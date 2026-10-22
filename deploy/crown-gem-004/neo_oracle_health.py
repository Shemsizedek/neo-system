"""Read-only health check for the configured NEO Oracle service."""
import json,os,urllib.parse,urllib.request
def check(opener=None):
    url=os.getenv("NEO_ORACLE_API_URL","")
    parsed=urllib.parse.urlsplit(url)
    if parsed.scheme!="https" or parsed.path!="/api/oracle" or not parsed.hostname or parsed.query or parsed.fragment or parsed.username or parsed.password:
        return {"configured":False,"reachable":False,"reason":"invalid_endpoint"}
    health=urllib.parse.urlunsplit(("https",parsed.netloc,"/healthz","",""))
    try:
        req=urllib.request.Request(health,headers={"Accept":"application/json"})
        with (opener or urllib.request.urlopen)(req,timeout=5) as response:
            if getattr(response,"status",200)!=200:return {"configured":True,"reachable":False,"reason":"unhealthy"}
            raw=response.read(4097)
        if len(raw)>4096:raise ValueError("oversize")
        result=json.loads(raw)
        healthy=isinstance(result,dict) and result.get("ok") is True and result.get("service")=="neo-prime-runtime"
        return {"configured":True,"reachable":healthy,"reason":"ok" if healthy else "unhealthy"}
    except Exception:
        return {"configured":True,"reachable":False,"reason":"unreachable"}
