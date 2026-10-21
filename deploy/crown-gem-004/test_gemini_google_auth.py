import os,sys,pathlib,unittest
from unittest.mock import patch
sys.path.insert(0,str(pathlib.Path(__file__).parent))
import gemini_google_auth as auth
class GoogleAuthTests(unittest.TestCase):
 def test_unconfigured_fails_closed(self):
  with patch.dict(os.environ,{},clear=True):
   with self.assertRaises(ValueError):auth.verify_google_credential("fake")
 def test_empty_token_rejected_before_verification(self):
  with patch.dict(os.environ,{"NEO_GEM_GOOGLE_CLIENT_ID":"example.apps.googleusercontent.com","NEO_GEM_GOOGLE_ALLOWED_SUB":"owner"}):
   with self.assertRaises(ValueError):auth.verify_google_credential("")
if __name__=="__main__":unittest.main()
