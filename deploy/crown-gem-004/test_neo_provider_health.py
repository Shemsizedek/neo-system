import os,pathlib,sys,unittest
from unittest.mock import patch
sys.path.insert(0,str(pathlib.Path(__file__).parent))
from neo_provider_health import report
class HealthTests(unittest.TestCase):
 def test_no_secrets_returned(self):
  with patch.dict(os.environ,{"NEO_OPENAI_API_KEY":"secret","NEO_OPENAI_MODEL":"example","GEMINI_API_KEY":"secret2"},clear=True):
   result=report()
  self.assertNotIn("secret",str(result))
  self.assertTrue(result["providers"]["openai"]["configured"])
  self.assertFalse(result["providers"]["openai"]["verified_live"])
 def test_unconfigured_defaults(self):
  with patch.dict(os.environ,{},clear=True):
   self.assertFalse(report()["providers"]["gemini"]["configured"])
if __name__=="__main__":unittest.main()
