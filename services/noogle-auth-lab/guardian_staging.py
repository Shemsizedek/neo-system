"""NSEC-028 integration harness for existing Guardian security components.

This test harness never exposes HTTP endpoints or enables a terminal.
A verifier is injected for controlled tests; production must use the
cryptographic WebAuthn verifier and fresh trusted NEO Pass proof.
"""
from enrollment import EnrollmentCoordinator
from registry import Registry
from durable_sessions import DurableEnrollmentSessions

class GuardianStagingHarness:
    def __init__(self, registry_path, sessions_path):
        self.registry=Registry(registry_path)
        self.sessions=DurableEnrollmentSessions(sessions_path)
        self.enrollment=EnrollmentCoordinator(self.registry)

    def begin_enrollment(self, owner, proof, now):
        session, csrf=self.sessions.issue_verified(owner,proof,now=now)
        challenge=self.enrollment.start(owner)
        return session,csrf,challenge.challenge

    def validate_enrollment_session(self, owner, session, csrf, now):
        if not self.sessions.authorize(session,csrf,owner,now=now):
            raise PermissionError("enrollment_session_denied")
        return owner

    def revoke_session(self, owner, session):
        return self.sessions.revoke(session,owner)

    def terminal(self,*args,**kwargs):
        raise PermissionError("remote_terminal_disabled")
