import io,os,pathlib,sys,unittest
from unittest.mock import patch
sys.path.insert(0,str(pathlib.Path(__file__).parent))
import gemini_private_web as web

class GoogleSessionTests(unittest.TestCase):
 def test_password_alone_does_not_enable_google_session(self):
  with patch.dict(os.environ,{"NEO_GEM_CHAT_PASSWORD":"x"*32,"CROWN_BRIDGE_TOKEN":"x"*32},clear=True):
   self.assertFalse(web.configured())
 def test_google_settings_enable_interface(self):
  with patch.dict(os.environ,{"NEO_GEM_GOOGLE_CLIENT_ID":"sample.apps.googleusercontent.com","NEO_GEM_GOOGLE_ALLOWED_SUB":"123","CROWN_BRIDGE_TOKEN":"x"*32},clear=True):
   self.assertTrue(web.configured())
 def test_google_login_rejects_invalid_credential(self):
  class H:
   path="/gemini/google"
   headers={"Origin":"https://neo.example","Host":"neo.example","Content-Length":"27"}
   rfile=io.BytesIO(b'{"credential":"bad-value"}')
   result=None
   def respond(self,status,body):
    self.result=(status,body)
    return self.result
  h=H();h.headers["Content-Length"]=str(len(h.rfile.getvalue()))
  with patch.dict(os.environ,{"NEO_GEM_GOOGLE_CLIENT_ID":"sample.apps.googleusercontent.com","NEO_GEM_GOOGLE_ALLOWED_SUB":"123","CROWN_BRIDGE_TOKEN":"x"*32},clear=True):
   with patch("gemini_google_auth.verify_google_credential",side_effect=ValueError("invalid")):
    status,body=web.post(h)
  self.assertEqual(status,401)
  self.assertNotIn("bad-value",str(body))
if __name__=="__main__":unittest.main()
