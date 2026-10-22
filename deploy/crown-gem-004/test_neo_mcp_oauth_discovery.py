import pathlib,sys,unittest
sys.path.insert(0,str(pathlib.Path(__file__).parent))
from neo_mcp_oauth_discovery import metadata,RESOURCE
class DiscoveryTests(unittest.TestCase):
 def test_missing_issuer_fails_closed(self):
  status,data=metadata({})
  self.assertEqual(status,503)
  self.assertNotIn("authorization_servers",data)
 def test_http_issuer_rejected(self):
  self.assertEqual(metadata({"NEO_MCP_OAUTH_ISSUER":"http://localhost:8000"})[0],503)
 def test_valid_https_issuer(self):
  status,data=metadata({"NEO_MCP_OAUTH_ISSUER":"https://auth.example.org"})
  self.assertEqual(status,200)
  self.assertEqual(data["resource"],RESOURCE)
  self.assertEqual(data["authorization_servers"],["https://auth.example.org"])
 def test_credentials_in_issuer_denied(self):
  self.assertEqual(metadata({"NEO_MCP_OAUTH_ISSUER":"https://user:pass@example.org"})[0],503)
if __name__=="__main__":unittest.main()
