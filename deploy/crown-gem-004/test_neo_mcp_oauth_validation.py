import unittest,sys,pathlib,time
sys.path.insert(0,str(pathlib.Path(__file__).parent))
from neo_mcp_oauth_validation import verify_access_token
class Checks(unittest.TestCase):
 def test_missing_config(self):
  with self.assertRaises(ValueError):verify_access_token("x",env={})
 def test_no_verifier(self):
  env=dict(NEO_MCP_OAUTH_ISSUER="https://auth.example",NEO_MCP_OAUTH_AUDIENCE="neo",NEO_MCP_OAUTH_OWNER_SUB="owner")
  with self.assertRaises(ValueError):verify_access_token("x",env=env)
if __name__=="__main__":unittest.main()
