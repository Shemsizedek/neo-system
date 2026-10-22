"""GEM-093: scope and validate development PR requests; never merge/deploy."""
import re
def development_pr_plan(manifest,repository="Shemsizedek/neo-system",target="main"):
    if manifest.get("schema")!="neo.gem.github.review.v1" or manifest.get("approved") is not False:
        raise ValueError("review manifest required")
    if repository!="Shemsizedek/neo-system":raise ValueError("repository not authorized")
    if target!="main":raise ValueError("protected base branch")
    digest=manifest.get("digest_sha256","")
    if not isinstance(digest,str) or not re.fullmatch("[a-f0-9]{64}",digest):raise ValueError("invalid manifest digest")
    return {"repository":repository,"base":target,"head":"gem-development/"+digest[:16],
            "draft":True,"manifest_digest":digest,
            "actions":["create_scoped_branch","apply_reviewed_patch","run_ci","create_draft_pr"],
            "approval_required_for":["write_patch","merge","deploy"],
            "write_authorized":False,"merge_authorized":False,"deploy_authorized":False,
            "status":"planning_only"}
