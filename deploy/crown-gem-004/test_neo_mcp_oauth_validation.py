import unittest,sys,pathlib,time
sys.path.insert(0,str(pathlib.Path(__file__).parent))
from neo_mcp_oauth_validation import verify_access_token
class Checks(unittest.TestCase):
 def test_missing_config(self):
  with self.assertRaises(ValueError):verify_access_token("x",env={})
 def test_no_verifier(self):
  env=dict(NEO_MCP_OAUTH_ISSUER="https://auth.example",NEO_MCP_OAUTH_AUDIENCE="neo",NEO_MCP_OAUTH_OWNER_SUB="owner")
  with self.assertRaises(ValueError):verify_access_token("x",env=env)
 def test_rejects_expired_and_wrong_audience(self):
  base={"NEO_MCP_OAUTH_ISSUER":"https://auth.example","NEO_MCP_OAUTH_AUDIENCE":"neo","NEO_MCP_OAUTH_OWNER_SUB":"owner"}
  claims={"iss":"https://auth.example","aud":"neo","sub":"owner","exp":time.time()-1,"scope":"neo.read"}
  with self.assertRaises(ValueError):verify_access_token("x",env=base,verifier=lambda t,a:claims)
  claims["exp"]=time.time()+300
  claims["aud"]="wrong"
  with self.assertRaises(ValueError):verify_access_token("x",env=base,verifier=lambda t,a:claims)
 def test_preparation_scope_is_separate(self):
  base={"NEO_MCP_OAUTH_ISSUER":"https://auth.example","NEO_MCP_OAUTH_AUDIENCE":"neo","NEO_MCP_OAUTH_OWNER_SUB":"owner"}
  claims={"iss":"https://auth.example","aud":"neo","sub":"owner","exp":time.time()+300,"scope":"neo.read"}
  with self.assertRaises(ValueError):verify_access_token("x",tool="neo_prepare_development",env=base,verifier=lambda t,a:claims)
if __name__=="__main__":unittest.main()
