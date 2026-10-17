"""NSEC-020 WebAuthn enrollment coordinator, server-only and fail-closed.

This is NOT an HTTP service. Caller must authenticate account and enforce
CSRF, rate limits, HTTPS, and session policy before invoking these methods.
"""
from dataclasses import dataclass
from base64 import urlsafe_b64encode
import secrets
from webauthn_adapter import verify_new_credential

def b64url(data):
    return urlsafe_b64encode(data).rstrip(b"=").decode("ascii")

@dataclass(frozen=True)
class RegistrationRequest:
    challenge: str
    rp_id: str
    user_id: str

class EnrollmentCoordinator:
    RP_ID="connect.holytemples.org"
    def __init__(self, registry):
        self.registry=registry
    def start(self, authenticated_user_id):
        if not authenticated_user_id:
            raise PermissionError("NEO Pass login required")
        token=self.registry.issue(authenticated_user_id,"enroll")
        return RegistrationRequest(token,self.RP_ID,authenticated_user_id)
    def finish(self, authenticated_user_id, challenge, credential_response):
        if not authenticated_user_id:
            raise PermissionError("NEO Pass login required")
        # Cryptographic verification must occur before changing device state.
        credential=verify_new_credential(credential_response, challenge)
        # A challenge is atomically consumed before persistence. Reuse fails closed.
        if not self.registry.consume(challenge,authenticated_user_id,"enroll"):
            raise PermissionError("challenge expired, mismatched or already used")
        credential_id=b64url(credential.credential_id)
        public_key=b64url(credential.public_key)
        # Server-side verification result, not a client-supplied boolean.
        self.registry.enroll_verified(authenticated_user_id,credential_id,public_key,verified=True)
        return credential_id
    def terminal(self,*args,**kwargs):
        raise PermissionError("remote terminal remains disabled")
