"""GEM-092: bounded GitHub review proposal manifest. No GitHub token, commits or deploys."""
import hashlib,json,re
def prepare_patch(proposal,files,base_sha):
    if proposal.get("schema")!="neo.gem.development.proposal.v1":raise ValueError("invalid proposal")
    if not re.fullmatch("[0-9a-f]{40}",base_sha):raise ValueError("pin GitHub base commit SHA")
    if not isinstance(files,list) or not 1<=len(files)<=10:raise ValueError("invalid file count")
    changes=[]
    for f in files:
        path=f.get("path","")
        content=f.get("content","")
        if not isinstance(path,str) or not re.fullmatch("[A-Za-z0-9][A-Za-z0-9._/-]{0,180}",path) or ".." in path or path.startswith("/") or "/.git/" in path:
            raise ValueError("unsafe patch path")
        if not isinstance(content,str) or len(content.encode())>50000:raise ValueError("invalid file content")
        changes.append({"path":path,"sha256":hashlib.sha256(content.encode()).hexdigest(),"bytes":len(content.encode())})
    if len({c["path"] for c in changes})!=len(changes):raise ValueError("duplicate path")
    manifest={"schema":"neo.gem.github.review.v1","project":proposal["project"],"base_sha":base_sha,
              "changes":changes,"tests_status":"not_run","review_status":"awaiting_review",
              "approved":False,"repo_write":False,"merge":False,"deploy":False}
    manifest["digest_sha256"]=hashlib.sha256(json.dumps(manifest,sort_keys=True,separators=(",",":")).encode()).hexdigest()
    return manifest
