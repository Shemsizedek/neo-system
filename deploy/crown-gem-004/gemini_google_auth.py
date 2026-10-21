"""Verify Google ID tokens. Owner can allowlist verified email; sub optional."""
import os

def verify_google_credential(credential):
    client_id=os.getenv("NEO_GEM_GOOGLE_CLIENT_ID","").strip()
    allowed_sub=os.getenv("NEO_GEM_GOOGLE_ALLOWED_SUB","").strip()
    allowed_email=os.getenv("NEO_GEM_GOOGLE_ALLOWED_EMAIL","").strip().casefold()
    if not client_id or not (allowed_sub or allowed_email):
        raise ValueError("Google sign-in is not configured")
    if not isinstance(credential,str) or not credential or len(credential)>8192:
        raise ValueError("Invalid identity token")
    from google.oauth2 import id_token
    from google.auth.transport import requests
    claims=id_token.verify_oauth2_token(credential,requests.Request(),client_id)
    if claims.get("iss") not in ("accounts.google.com","https://accounts.google.com"):
        raise ValueError("Untrusted issuer")
    subject=claims.get("sub")
    if not isinstance(subject,str) or not subject:
        raise ValueError("Missing Google subject")
    if claims.get("email_verified") is not True:
        raise ValueError("Google email not verified")
    email=claims.get("email")
    if allowed_sub and subject!=allowed_sub:
        raise ValueError("Google account is not authorized")
    if allowed_email and (not isinstance(email,str) or email.casefold()!=allowed_email):
        raise ValueError("Google account is not authorized")
    return subject
