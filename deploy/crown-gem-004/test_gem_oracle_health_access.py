import pathlib,sys,unittest
from unittest.mock import patch
sys.path.insert(0,str(pathlib.Path(__file__).parent))
import bridge
class OracleHealthAccessTests(unittest.TestCase):
 def test_oracle_health_handler_requires_google_session(self):
  class H:
   path="/gemini/oracle-health"
   client_address=("127.0.0.1",12345)
   def __init__(self):self.response=None
   def respond(self,status,data):self.response=(status,data)
  h=H()
  with patch("gemini_private_web.configured",return_value=True),patch("gemini_private_web.session",return_value=False):
   bridge.Handler.do_GET(h)
  self.assertEqual(h.response[0],401)
 def test_authenticated_oracle_health_is_read_only(self):
  class H:
   path="/gemini/oracle-health"
   client_address=("127.0.0.1",12345)
   def __init__(self):self.response=None
   def respond(self,status,data):self.response=(status,data)
  h=H()
  with patch("gemini_private_web.configured",return_value=True),patch("gemini_private_web.session",return_value=True),patch("bridge.quota_allowed",return_value=True),patch("neo_oracle_health.check",return_value={"configured":False,"reachable":False}):
   bridge.Handler.do_GET(h)
  self.assertEqual(h.response,(200,{"configured":False,"reachable":False}))
if __name__=="__main__":unittest.main()
