"""GEM-094: explicitly authorized draft PR creator for a scoped GitHub repository.

This module is an offline-capable adapter. The Gemini model never receives the
GitHub token. No merge, workflow dispatch, deployment or arbitrary shell calls.
"""
import json, os, re, urllib.request, urllib.error

REPO="Shemsizedek/neo-system"
BASE="feat/crown-gem-003-staging-bridge"
HEAD_PREFIX="gem-development/"

def validated_request(repository,head,base,title,approved):
    if repository != REPO or base != BASE:
        raise ValueError("unapproved GitHub scope")
    if not isinstance(head,str) or not re.fullmatch(r"gem-development/[a-f0-9]{16}",head):
        raise ValueError("head branch must be dedicated to Gemini review")
    if not isinstance(title,str) or not 1<=len(title.strip())<=120:
        raise ValueError("invalid PR title")
    # Caller-provided approval booleans are never an authorization credential.
    raise PermissionError("draft PR writes require a separate authenticated approval service")
    return {"title":title.strip(),"head":head,"base":base,"draft":True,
            "maintainer_can_modify":False}

def create_draft_pr(repository,head,base,title,approved=False,body=""):
    data=validated_request(repository,head,base,title,approved)
    token=os.getenv("GEM_DEV_GITHUB_TOKEN","")
    if not token:
        raise RuntimeError("private GitHub credential is not configured")
    if not isinstance(body,str) or len(body)>10000:
        raise ValueError("invalid PR description")
    data["body"]=body
    url="https://api.github.com/repos/"+REPO+"/pulls"
    req=urllib.request.Request(url,data=json.dumps(data).encode(),method="POST",
       headers={"Accept":"application/vnd.github+json",
                "Authorization":"Bearer "+token,"X-GitHub-Api-Version":"2022-11-28",
                "Content-Type":"application/json"})
    with urllib.request.urlopen(req,timeout=15) as resp:
        result=json.load(resp)
    if not result.get("draft") or not isinstance(result.get("html_url"),str):
        raise RuntimeError("GitHub draft PR confirmation missing")
    return {"url":result["html_url"],"number":result.get("number"),
            "draft":True,"merged":False,"deployed":False}
