"""GEM-122 OAuth protected-resource discovery for external MCP clients.

Only advertise an actually configured authorization server. This is discovery
metadata, not an OAuth provider, token endpoint or automatic Gem connector.
"""
import os
from urllib.parse import urlparse

RESOURCE="https://neo-crown-gem-staging.onrender.com/mcp"
def metadata(environ=None):
    env=os.environ if environ is None else environ
    issuer=env.get("NEO_MCP_OAUTH_ISSUER","").strip()
    parsed=urlparse(issuer)
    if not issuer or parsed.scheme!="https" or not parsed.hostname or parsed.username or parsed.password or parsed.query or parsed.fragment:
        return 503,{"error":"OAuth authorization server not configured"}
    return 200,{"resource":RESOURCE,"authorization_servers":[issuer.rstrip("/")],
                "scopes_supported":["neo.read","neo.development.prepare"],
                "bearer_methods_supported":["header"]}
