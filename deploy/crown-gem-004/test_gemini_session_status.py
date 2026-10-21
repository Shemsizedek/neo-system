import io,os,pathlib,sys,unittest
from unittest.mock import patch
sys.path.insert(0,str(pathlib.Path(__file__).parent))
import gemini_private_web as web
class Handler:
 path='/gemini/session'
 headers={}
 def respond(self,status,data):return status,data
class SessionStatusTests(unittest.TestCase):
 def test_logged_out_session(self):
  with patch.object(web,'configured',return_value=True),patch.object(web,'session',return_value=False):
   status,data=web.get(Handler())
  self.assertEqual((status,data['authenticated']),(200,False))
 def test_logged_in_session(self):
  with patch.object(web,'configured',return_value=True),patch.object(web,'session',return_value=True):
   status,data=web.get(Handler())
  self.assertEqual((status,data['authenticated']),(200,True))
if __name__=='__main__':unittest.main()
