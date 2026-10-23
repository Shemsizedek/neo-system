import os,pathlib,sys,tempfile,threading,unittest
sys.path.insert(0,str(pathlib.Path(__file__).parent))
from gem_confirmation_gate import ConfirmationGate
class ConfirmationTests(unittest.TestCase):
 def setUp(self):
  self.tmp=tempfile.TemporaryDirectory();self.g=ConfirmationGate(os.path.join(self.tmp.name,"test.sqlite"))
  self.req='["repo","base","head","commit","digest","title"]'
 def tearDown(self):self.tmp.cleanup()
 def test_one_time(self):
  a=self.g.stage("google-owner",self.req)
  args=("google-owner",a["nonce"],a["csrf_token"],self.req,a["digest"])
  self.assertTrue(self.g.confirm(*args));self.assertFalse(self.g.confirm(*args))
 def test_csrf_denied(self):
  a=self.g.stage("google-owner",self.req)
  self.assertFalse(self.g.confirm("google-owner",a["nonce"],"wrong",self.req,a["digest"]))
 def test_changed_request_denied(self):
  a=self.g.stage("google-owner",self.req)
  self.assertFalse(self.g.confirm("google-owner",a["nonce"],a["csrf_token"],self.req+"x",a["digest"]))
 def test_wrong_identity_denied(self):
  a=self.g.stage("google-owner",self.req)
  self.assertFalse(self.g.confirm("another",a["nonce"],a["csrf_token"],self.req,a["digest"]))
 def test_concurrent_only_one(self):
  a=self.g.stage("owner",self.req);results=[]
  def work():results.append(self.g.confirm("owner",a["nonce"],a["csrf_token"],self.req,a["digest"]))
  ts=[threading.Thread(target=work) for _ in range(6)]
  for t in ts:t.start()
  for t in ts:t.join()
  self.assertEqual(results.count(True),1)
if __name__=="__main__":unittest.main()
