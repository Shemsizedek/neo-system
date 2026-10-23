import os,pathlib,sys,tempfile,unittest
from unittest.mock import patch
sys.path.insert(0,str(pathlib.Path(__file__).parent))
from gem_google_bound_approval import GoogleBoundApproval
from gem_durable_approvals import DurableApprovalStore
class GoogleApprovalTests(unittest.TestCase):
 def setUp(self):
  self.tmp=tempfile.TemporaryDirectory()
  self.bridge=GoogleBoundApproval(DurableApprovalStore(os.path.join(self.tmp.name,"a.db"),b"k"*32))
  self.args=("Shemsizedek/neo-system","feat/crown-gem-003-staging-bridge","gem-development/"+"a"*16,"b"*40,"a"*64,"NEO PR")
 def tearDown(self):self.tmp.cleanup()
 def test_owner_token_single_use(self):
  with patch("gem_google_bound_approval.verify_google_credential",return_value="google-owner"):
   token=self.bridge.issue("google-token",*self.args)
   self.assertTrue(self.bridge.consume("google-token",token,*self.args))
   self.assertFalse(self.bridge.consume("google-token",token,*self.args))
 def test_forged_identity_rejected(self):
  with patch("gem_google_bound_approval.verify_google_credential",side_effect=ValueError("invalid Google token")):
   with self.assertRaises(ValueError):self.bridge.issue("forged-token",*self.args)
 def test_other_verified_account_cannot_consume(self):
  with patch("gem_google_bound_approval.verify_google_credential",side_effect=["owner","other"]):
   token=self.bridge.issue("owner-token",*self.args)
   self.assertFalse(self.bridge.consume("other-token",token,*self.args))
 def test_changed_commit_rejected(self):
  with patch("gem_google_bound_approval.verify_google_credential",return_value="owner"):
   token=self.bridge.issue("owner-token",*self.args)
   args=list(self.args);args[3]="c"*40
   self.assertFalse(self.bridge.consume("owner-token",token,*args))
if __name__=="__main__":unittest.main()
