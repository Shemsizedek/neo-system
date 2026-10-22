"""Fail-closed OAuth access-token validation for the private MCP boundary."""
import os
from urllib.parse import urlparse
from google.oauth2 import id_token
from google.auth.transport import requests

RESOURCE="https://neo-crown-gem-staging.onrender.com/mcp"
def verify_access_token(token,tool=None,env=None,verifier=None):
    env=os.environ if env is None else env
    issuer=env.get("NEO_MCP_OAUTH_ISSUER","").rstrip("/")
    audience=env.get("NEO_MCP_OAUTH_AUDIENCE","")
    owner=env.get("NEO_MCP_OAUTH_OWNER_SUB","")
    if not issuer or urlparse(issuer).scheme!="https" or not audience or not owner:
        raise ValueError("OAuth verification not configured")
    if not isinstance(token,str) or not 1<=len(token)<=8192:
        raise ValueError("Invalid access token")
    if verifier is None:
        raise ValueError("Issuer-specific access-token verifier not connected")
    claims=verifier(token,audience)
    if not isinstance(claims,dict) or claims.get("iss","").rstrip("/")!=issuer or claims.get("sub")!=owner:
        raise ValueError("Invalid issuer or owner")
    if claims.get("aud")!=audience and not (isinstance(claims.get("aud"),list) and audience in claims["aud"]):
        raise ValueError("Invalid audience")
    import time
    if not isinstance(claims.get("exp"),(int,float)) or claims["exp"]<=time.time():
        raise ValueError("Expired token")
    scopes=set(str(claims.get("scope","")).split())
    required="neo.development.prepare" if tool=="neo_prepare_development" else "neo.read"
    if required not in scopes:
        raise ValueError("Insufficient scope")
    return {"subject":owner,"scope":required}
