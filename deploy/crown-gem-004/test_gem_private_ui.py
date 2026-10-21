import pathlib,sys,unittest
sys.path.insert(0,str(pathlib.Path(__file__).parent))
import gemini_private_web as ui
class PrivateUI(unittest.TestCase):
 def test_google_allowlist_required(self):
  from unittest.mock import patch
  with patch.dict(ui.os.environ,{"NEO_GEM_GOOGLE_CLIENT_ID":"id","CROWN_BRIDGE_TOKEN":"x"*32},clear=True):
   self.assertFalse(ui.configured())
 def test_private_single_operator_interface(self):
  self.assertIn('PRIVATE',ui.HTML)
  self.assertIn('id="conversation"',ui.HTML)
  self.assertIn("textContent=body",ui.HTML)
  self.assertNotIn("innerHTML",ui.HTML)
 def test_review_before_sending(self):
  self.assertIn("Draft received from Gemini Gem. Review it and press Send.",ui.HTML)
  self.assertIn("if(!message)return",ui.HTML)
if __name__=="__main__":unittest.main()
