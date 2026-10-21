import io,os,pathlib,sys,time,unittest
from unittest.mock import patch
sys.path.insert(0,str(pathlib.Path(__file__).parent))
import gemini_private_web as w
class PrivateChatTests(unittest.TestCase):
 def test_missing_secrets_disabled(self):
  with patch.dict(os.environ,{},clear=True):self.assertFalse(w.configured())
 def test_session_signature_rejects_tamper(self):
  with patch.dict(os.environ,{"CROWN_BRIDGE_TOKEN":"x"*32}):
   now=str(int(time.time()));nonce="abcdef"
   class H:headers={"Cookie":"neo_gem_session="+now+"."+nonce+".bad"}
   self.assertFalse(w.session(H()))
 def test_origin_requires_https_same_host(self):
  class H:headers={"Origin":"https://bad.example","Host":"neo.example"}
  self.assertFalse(w.origin_ok(H()))
 def test_valid_origin(self):
  class H:headers={"Origin":"https://neo.example","Host":"neo.example"}
  self.assertTrue(w.origin_ok(H()))
 def test_reject_oversized_body(self):
  class H:headers={"Content-Length":"6000"};rfile=io.BytesIO()
  with self.assertRaises(ValueError):w.payload(H())
if __name__=="__main__":unittest.main()
