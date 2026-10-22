"""GEM-113: read-only GitHub PR status for one allowlisted private chat.
Only fixed repository and PR; no caller-selected URL or GitHub credentials.
"""
import json,urllib.request,urllib.error
URL="https://api.github.com/repos/Shemsizedek/neo-system/pulls/1060"
def fetch_status(opener=None):
    opener=opener or urllib.request.urlopen
    req=urllib.request.Request(URL,headers={"Accept":"application/vnd.github+json","User-Agent":"NEO-Gem-ReadOnly/1.0"})
    try:
        with opener(req,timeout=8) as resp:
            raw=resp.read(65537)
            if len(raw)>65536:raise ValueError("oversized GitHub response")
            data=json.loads(raw)
    except (OSError,ValueError,urllib.error.URLError,json.JSONDecodeError):
        return 502,{"error":"GitHub status temporarily unavailable"}
    if not isinstance(data,dict) or data.get("number")!=1060:
        return 502,{"error":"unexpected GitHub status"}
    return 200,{"number":1060,"state":data.get("state") if data.get("state") in ("open","closed") else "unknown",
                "draft":data.get("draft") is True,"merged":data.get("merged") is True,
                "url":"https://github.com/Shemsizedek/neo-system/pull/1060",
                "updated_at":str(data.get("updated_at") or "")[:40]}
