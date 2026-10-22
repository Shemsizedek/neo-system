import os,pathlib,sys,unittest
from unittest.mock import patch
sys.path.insert(0,str(pathlib.Path(__file__).parent))
from neo_provider_runtime import available,execute
import gemini_private_web
class ProviderTests(unittest.TestCase):
 def test_unconfigured_providers_disabled(self):
  with patch.dict(os.environ,{},clear=True):
   self.assertEqual(available(),{"gemini":False,"openai":False,"neo-oracle":False})
 def test_unavailable_provider_rejected(self):
  with self.assertRaises(ValueError):execute("openai","hello")
 def test_provider_selector_keeps_disabled_options(self):
  self.assertIn('value="openai" disabled',gemini_private_web.HTML)
  self.assertIn('value="neo-oracle" disabled',gemini_private_web.HTML)
 def test_authenticated_route_rejects_other_provider(self):
  self.assertIn('if provider!="gemini":return handler.respond(400',pathlib.Path(gemini_private_web.__file__).read_text())
if __name__=="__main__":unittest.main()
