"""GEM-099: approval identity is derived from Google's verified token, never request-supplied subject.
Unmounted staging adapter; no public approval endpoint or GitHub writes.
"""
from gemini_google_auth import verify_google_credential
from gem_approval_service import canonical

class GoogleBoundApproval:
    def __init__(self,store):
        self.store=store
    def _subject(self,credential):
        # Enforces Google signature, audience, issuer, verified email and allowlist.
        return verify_google_credential(credential)
    def issue(self,credential,repo,base,head,commit,manifest_digest,title):
        subject=self._subject(credential)
        details=canonical(repo,base,head,commit,manifest_digest,title)
        return self.store.issue(subject,details,verified_subject=subject)
    def consume(self,credential,token,repo,base,head,commit,manifest_digest,title):
        subject=self._subject(credential)
        details=canonical(repo,base,head,commit,manifest_digest,title)
        return self.store.consume(token,subject,details,verified_subject=subject)
