"""GEM-091: create reviewable development proposals, never execute code or deployments."""
import re

def propose(request, project="neo-system"):
    if not isinstance(request,str) or not 1<=len(request.strip())<=2000:
        raise ValueError("invalid development request")
    if not re.fullmatch(r"[A-Za-z0-9][A-Za-z0-9._/-]{0,100}",project) or ".." in project:
        raise ValueError("invalid project")
    return {
        "schema":"neo.gem.development.proposal.v1",
        "project":project,
        "objective":request.strip(),
        "workflow":["specify","generate_patch","review_diff","run_tests","approve_merge","approve_deploy"],
        "state":"draft",
        "execution_authorized":False,
        "repository_write_authorized":False,
        "deployment_authorized":False,
        "required_approvals":["merge","deploy"],
        "warning":"A Gemini Gem handoff does not grant GitHub or Render permissions."
    }
