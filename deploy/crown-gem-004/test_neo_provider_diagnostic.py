import os,pathlib,sys,unittest
from unittest.mock import patch
sys.path.insert(0,str(pathlib.Path(__file__).parent))
from neo_provider_diagnostic import diagnose
class DiagnosticTests(unittest.TestCase):
 def test_missing_credentials(self):
  with patch.dict(os.environ,{},clear=True):
   self.assertEqual(diagnose("openai")["reason"],"not_configured")
 def test_valid_probe(self):
  with patch.dict(os.environ,{"NEO_OPENAI_API_KEY":"private","NEO_OPENAI_MODEL":"test"},clear=True):
   r=diagnose("openai",probe=lambda:{"response":{"parts":[{"text":"NEO-OK"}]}})
  self.assertTrue(r["verified"]);self.assertNotIn("private",str(r))
 def test_failure_is_redacted(self):
  def failure():raise RuntimeError("secret token exposed")
  with patch.dict(os.environ,{"NEO_OPENAI_API_KEY":"private","NEO_OPENAI_MODEL":"test"},clear=True):
   r=diagnose("openai",probe=failure)
  self.assertFalse(r["verified"]);self.assertNotIn("secret",str(r))
 def test_unknown_provider_denied(self):
  self.assertFalse(diagnose("neo-oracle")["verified"])
if __name__=="__main__":unittest.main()
