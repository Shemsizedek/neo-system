import pathlib,sys,unittest
sys.path.insert(0,str(pathlib.Path(__file__).parent))
import gemini_private_web as ui
class UniversalHandoffTests(unittest.TestCase):
 def test_any_gem_can_supply_a_label(self):
  self.assertIn("params.get('source')",ui.HTML)
  self.assertIn("sourceLabel",ui.HTML)
  self.assertIn("params.get('prompt')",ui.HTML)
 def test_source_label_is_not_an_authentication_credential(self):
  self.assertIn("googleSignIn",ui.HTML)
  self.assertIn("review",ui.HTML.lower())
  self.assertNotIn("innerHTML",ui.HTML)
if __name__=="__main__":unittest.main()
