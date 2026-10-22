"""GEM-118 MCP connection preflight; conservative about OAuth readiness."""
import os
from neo_gem_mcp import respond

def report(env=None):
    env=os.environ if env is None else env
    methods=[x["name"] for x in respond({"jsonrpc":"2.0","id":1,"method":"tools/list"})["result"]["tools"]]
    return {
      "mcp_http_route":"/mcp",
      "transport":"HTTP JSON-RPC",
      "transport_authenticated":len(env.get("NEO_MCP_ACCESS_TOKEN",""))>=32,
      "oauth_authorization_server_configured":False,
      "dynamic_client_registration":False,
      "google_connected_app_verified":False,
      "consumer_gem_auto_forward":False,
      "conversation_history_sync":False,
      "tools":methods,
      "github_write_capability":False,
      "ready_for_google_connection":False,
      "next":"Configure a Google-supported OAuth flow or supported advanced credentials, then test actual registration."
    }
