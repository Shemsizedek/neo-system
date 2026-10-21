import pathlib,sys,unittest
sys.path.insert(0,str(pathlib.Path(__file__).parent))
from gem_approval_service import canonical,OneShotApprovals

class ApprovalTests(unittest.TestCase):
 def setUp(self):
  self.a=OneShotApprovals(b'x'*32)
  self.details=canonical("Shemsizedek/neo-system","feat/crown-gem-003-staging-bridge","gem-development/"+"a"*16,"b"*40,"a"*64,"NEO review")
 def test_missing_verified_session(self):
  with self.assertRaises(PermissionError):self.a.issue("google-sub",self.details)
 def test_once_only(self):
  token=self.a.issue("owner",self.details,authenticated=True,now=100)
  self.assertTrue(self.a.consume(token,"owner",self.details,now=101))
  self.assertFalse(self.a.consume(token,"owner",self.details,now=102))
 def test_wrong_identity(self):
  token=self.a.issue("owner",self.details,authenticated=True,now=100)
  self.assertFalse(self.a.consume(token,"another",self.details,now=101))
 def test_modified_patch(self):
  token=self.a.issue("owner",self.details,authenticated=True,now=100)
  self.assertFalse(self.a.consume(token,"owner",self.details+"x",now=101))
 def test_expired(self):
  token=self.a.issue("owner",self.details,authenticated=True,now=100)
  self.assertFalse(self.a.consume(token,"owner",self.details,now=281))
 def test_scope(self):
  with self.assertRaises(ValueError):canonical("other/repo","feat/crown-gem-003-staging-bridge","gem-development/"+"a"*16,"b"*40,"a"*64,"NEO review")
if __name__=="__main__":unittest.main()
