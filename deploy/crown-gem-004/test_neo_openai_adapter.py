import io,json,os,pathlib,sys,unittest
from unittest.mock import patch
sys.path.insert(0,str(pathlib.Path(__file__).parent))
import neo_openai_adapter as adapter
import neo_provider_runtime as runtime
class OpenAIAdapterTests(unittest.TestCase):
 def test_unconfigured_openai_is_disabled(self):
  with patch.dict(os.environ,{},clear=True):self.assertFalse(runtime.available()["openai"])
 def test_missing_credentials_fail_closed(self):
  with patch.dict(os.environ,{},clear=True):
   with self.assertRaises(RuntimeError):adapter.run("hello")
 def test_response_and_no_tools(self):
  class Reply:
   def __enter__(self):return io.BytesIO(json.dumps({"output":[{"type":"message","content":[{"type":"output_text","text":"Hello"}]}]}).encode())
   def __exit__(self,*args):return False
  def fake_open(req,timeout):
   self.assertEqual(req.full_url,"https://api.openai.com/v1/responses")
   self.assertFalse(json.loads(req.data)["store"])
   return Reply()
  with patch.dict(os.environ,{"NEO_OPENAI_API_KEY":"test-only","NEO_OPENAI_MODEL":"test-model"}):
   result=adapter.run("hello",opener=fake_open)
  self.assertEqual(result["response"]["parts"][0]["text"],"Hello")
  self.assertEqual(result["used_tools"],[])
 def test_neo_oracle_remains_disconnected(self):
  with self.assertRaises(ValueError):runtime.execute("neo-oracle","hello")
if __name__=="__main__":unittest.main()
