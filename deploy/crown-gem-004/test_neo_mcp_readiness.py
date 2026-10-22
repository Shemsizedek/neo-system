import pathlib,sys,unittest
sys.path.insert(0,str(pathlib.Path(__file__).parent))
from neo_mcp_readiness import report
class MCPConnectionReadiness(unittest.TestCase):
 def test_no_auth_secret(self):
  r=report({})
  self.assertFalse(r["transport_authenticated"])
  self.assertFalse(r["ready_for_google_connection"])
 def test_token_does_not_imply_oauth_or_google(self):
  r=report({"NEO_MCP_ACCESS_TOKEN":"a"*48})
  self.assertTrue(r["transport_authenticated"])
  self.assertFalse(r["oauth_authorization_server_configured"])
  self.assertFalse(r["google_connected_app_verified"])
  self.assertFalse(r["ready_for_google_connection"])
 def test_no_history_claims(self):
  r=report({"NEO_MCP_ACCESS_TOKEN":"a"*48})
  self.assertFalse(r["consumer_gem_auto_forward"])
  self.assertFalse(r["conversation_history_sync"])
  self.assertFalse(r["github_write_capability"])
 def test_tool_scope(self):
  self.assertEqual(report({})["tools"],["neo_status","neo_prepare_development"])
if __name__=="__main__":unittest.main()
