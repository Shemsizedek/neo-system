"""Verify Google Sign-In ID tokens for NEO Gemini; Google passwords never reach NEO."""
import os

def verify_google_credential(credential):
    client_id=os.getenv("NEO_GEM_GOOGLE_CLIENT_ID","")
    allowed_sub=os.getenv("NEO_GEM_GOOGLE_ALLOWED_SUB","")
    if not client_id or not allowed_sub:
        raise ValueError("Google sign-in is not configured")
    if not isinstance(credential,str) or not credential or len(credential)>8192:
        raise ValueError("Invalid identity token")
    from google.oauth2 import id_token
    from google.auth.transport import requests
    claims=id_token.verify_oauth2_token(credential,requests.Request(),client_id)
    if claims.get("iss") not in ("accounts.google.com","https://accounts.google.com"):
        raise ValueError("Untrusted issuer")
    if not claims.get("email_verified") or claims.get("sub")!=allowed_sub:
        raise ValueError("Google account is not authorized")
    return claims["sub"]
