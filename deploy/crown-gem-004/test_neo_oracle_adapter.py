import io,json,os,pathlib,sys,unittest
from unittest.mock import patch
sys.path.insert(0,str(pathlib.Path(__file__).parent))
import neo_oracle_adapter as oracle
from neo_provider_runtime import available
class OracleTests(unittest.TestCase):
 def test_disabled_without_config(self):
  with patch.dict(os.environ,{},clear=True):
   self.assertFalse(available()["neo-oracle"])
   with self.assertRaises(RuntimeError):oracle.run("hi")
 def test_requires_https_and_exact_path(self):
  with patch.dict(os.environ,{"NEO_ORACLE_API_URL":"http://localhost/api/oracle","NEO_ORACLE_SERVICE_TOKEN":"s"*32},clear=True):
   with self.assertRaises(RuntimeError):oracle.run("hi")
 def test_authenticated_request(self):
  class Resp:
   status=200
   def __enter__(self):return io.BytesIO(b'{"text":"Oracle ready"}')
   def __exit__(self,*args):pass
  def open_request(request,timeout):
   self.assertEqual(request.full_url,"https://example.org/api/oracle")
   self.assertEqual(json.loads(request.data)["requestedAction"],"analyze")
   self.assertTrue(request.get_header("Authorization").startswith("Bearer "))
   return Resp()
  with patch.dict(os.environ,{"NEO_ORACLE_API_URL":"https://example.org/api/oracle","NEO_ORACLE_SERVICE_TOKEN":"s"*32},clear=True):
   result=oracle.run("hi",opener=open_request)
  self.assertEqual(result["response"]["parts"][0]["text"],"Oracle ready")
 def test_approval_not_bypassed(self):
  class Resp:
   status=202
   def __enter__(self):return self
   def read(self,n):return b'{"text":"approval needed"}'
   def __exit__(self,*args):pass
  with patch.dict(os.environ,{"NEO_ORACLE_API_URL":"https://example.org/api/oracle","NEO_ORACLE_SERVICE_TOKEN":"s"*32},clear=True):
   with self.assertRaises(RuntimeError):oracle.run("hi",opener=lambda request,timeout:Resp())
if __name__=="__main__":unittest.main()
