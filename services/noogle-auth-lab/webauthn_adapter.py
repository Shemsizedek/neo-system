"""NSEC-019: server-side WebAuthn verification adapter. No HTTP endpoints.

Requires: pip install webauthn>=2,<3
Only call this from an authenticated, CSRF-protected backend, NEVER from a browser.
"""
from dataclasses import dataclass
from base64 import urlsafe_b64decode
from webauthn import verify_registration_response, verify_authentication_response
from webauthn.helpers.structs import UserVerificationRequirement

RP_ID = "connect.holytemples.org"
ORIGIN = "https://connect.holytemples.org"

def decode_b64url(value):
    if not isinstance(value,str) or not value:
        raise ValueError("missing encoded value")
    return urlsafe_b64decode(value + "=" * (-len(value) % 4))

@dataclass(frozen=True)
class VerifiedCredential:
    credential_id: bytes
    public_key: bytes
    sign_count: int

def verify_new_credential(credential_response, challenge_b64url):
    """Verify client data, RP ID, challenge, origin and user verification."""
    verified = verify_registration_response(
        credential=credential_response,
        expected_challenge=decode_b64url(challenge_b64url),
        expected_rp_id=RP_ID,
        expected_origin=ORIGIN,
        require_user_verification=True,
    )
    return VerifiedCredential(
        credential_id=verified.credential_id,
        public_key=verified.credential_public_key,
        sign_count=verified.sign_count,
    )

def verify_existing_credential(assertion_response, challenge_b64url, credential):
    """Use previously server-verified credential public key and counter."""
    return verify_authentication_response(
        credential=assertion_response,
        expected_challenge=decode_b64url(challenge_b64url),
        expected_rp_id=RP_ID,
        expected_origin=ORIGIN,
        credential_public_key=credential.public_key,
        credential_current_sign_count=credential.sign_count,
        require_user_verification=True,
    )
