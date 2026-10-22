import io,json,os,pathlib,sys,unittest
from unittest.mock import patch
sys.path.insert(0,str(pathlib.Path(__file__).parent))
from neo_oracle_health import check
class OracleHealthTests(unittest.TestCase):
 def test_unconfigured(self):
  with patch.dict(os.environ,{},clear=True):self.assertFalse(check()["configured"])
 def test_reachable(self):
  class Response:
   status=200
   def __enter__(self):return self
   def __exit__(self,*args):return False
   def read(self,n):return b'{"ok":true,"service":"neo-prime-runtime"}'
  def opener(req,timeout):
   self.assertEqual(req.full_url,"https://oracle.example.org/healthz")
   return Response()
  with patch.dict(os.environ,{"NEO_ORACLE_API_URL":"https://oracle.example.org/api/oracle"},clear=True):
   self.assertTrue(check(opener)["reachable"])
 def test_rejects_unexpected_service(self):
  class Response:
   status=200
   def __enter__(self):return self
   def __exit__(self,*args):return False
   def read(self,n):return b'{"ok":true,"service":"other"}'
  with patch.dict(os.environ,{"NEO_ORACLE_API_URL":"https://oracle.example.org/api/oracle"},clear=True):
   self.assertFalse(check(lambda req,timeout:Response())["reachable"])
if __name__=="__main__":unittest.main()
