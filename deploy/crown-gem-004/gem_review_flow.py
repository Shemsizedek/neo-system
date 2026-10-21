"""GEM-104: unmounted end-to-end staging orchestration.

Only trusted server callers may supply verified Google credentials. This module
cannot write GitHub, merge or deploy. A confirmation result is NOT authority
to invoke the still-disabled GitHub adapter.
"""
from gemini_google_auth import verify_google_credential
from gem_approval_service import canonical
from gem_confirmation_gate import ConfirmationGate

class DevelopmentReviewFlow:
    def __init__(self,db_path):
        self.gate=ConfirmationGate(db_path)
    def prepare(self,google_id_token,repo,base,head,commit,manifest_digest,title):
        sub=verify_google_credential(google_id_token)
        details=canonical(repo,base,head,commit,manifest_digest,title)
        staged=self.gate.stage(sub,details)
        return {"review_digest":staged["digest"],"review_nonce":staged["nonce"],
                "csrf_token":staged["csrf_token"],"expires_at":staged["expires_at"],
                "status":"pending_confirmation","github_write_enabled":False}
    def confirm(self,google_id_token,repo,base,head,commit,manifest_digest,title,nonce,csrf,digest):
        sub=verify_google_credential(google_id_token)
        details=canonical(repo,base,head,commit,manifest_digest,title)
        ok=self.gate.confirm(sub,nonce,csrf,details,digest)
        return {"confirmed":ok,"status":"confirmed_review_only" if ok else "denied",
                "github_write_enabled":False,"merge_enabled":False,"deploy_enabled":False}
