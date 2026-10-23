import os,pathlib,sys,tempfile,threading,unittest
sys.path.insert(0,str(pathlib.Path(__file__).parent))
from gem_durable_approvals import DurableApprovalStore
class DurableTests(unittest.TestCase):
 def setUp(self):
  self.dir=tempfile.TemporaryDirectory();self.path=os.path.join(self.dir.name,"approvals.sqlite")
  self.a=DurableApprovalStore(self.path,b"k"*32)
 def tearDown(self):self.dir.cleanup()
 def test_atomic_one_use_across_instances(self):
  token=self.a.issue("google-sub","review digest","google-sub",now=100)
  b=DurableApprovalStore(self.path,b"k"*32)
  out=[]
  def try_it():out.append(b.consume(token,"google-sub","review digest","google-sub",now=101))
  workers=[threading.Thread(target=try_it) for _ in range(8)]
  for w in workers:w.start()
  for w in workers:w.join()
  self.assertEqual(out.count(True),1);self.assertEqual(out.count(False),7)
 def test_wrong_identity(self):
  token=self.a.issue("owner","data","owner",now=100)
  self.assertFalse(self.a.consume(token,"owner","data","other",now=101))
 def test_changed_payload(self):
  token=self.a.issue("owner","data","owner",now=100)
  self.assertFalse(self.a.consume(token,"owner","modified","owner",now=101))
 def test_expiry(self):
  token=self.a.issue("owner","data","owner",now=100)
  self.assertFalse(self.a.consume(token,"owner","data","owner",now=281))
 def test_unverified_cannot_issue(self):
  with self.assertRaises(PermissionError):self.a.issue("owner","data","other")
if __name__=="__main__":unittest.main()
