import pathlib,sys,unittest
sys.path.insert(0,str(pathlib.Path(__file__).parent))
import gemini_private_web as web
class GemHandoffTests(unittest.TestCase):
 def test_handoff_prefills_but_does_not_auto_send(self):
  html=web.HTML
  self.assertIn("new URLSearchParams(fragment)",html)
  self.assertIn("params.get('prompt')",html)
  self.assertIn("$('prompt').value=draft",html)
  self.assertIn("Review it and press Send",html)
  self.assertNotIn("loadHandoff();$('send').click()",html)
 def test_fragment_removed_after_import(self):
  self.assertIn("history.replaceState(null,'',location.pathname+location.search)",web.HTML)
if __name__=='__main__':unittest.main()
