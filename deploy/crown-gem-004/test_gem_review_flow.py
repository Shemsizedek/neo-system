import os,pathlib,sys,tempfile,unittest
from unittest.mock import patch
sys.path.insert(0,str(pathlib.Path(__file__).parent))
from gem_review_flow import DevelopmentReviewFlow
class EndToEndReviewTests(unittest.TestCase):
 def setUp(self):
  self.tmp=tempfile.TemporaryDirectory()
  self.flow=DevelopmentReviewFlow(os.path.join(self.tmp.name,"approval.sqlite"))
  self.args=("Shemsizedek/neo-system","feat/crown-gem-003-staging-bridge","gem-development/"+"a"*16,"b"*40,"a"*64,"Review NEO")
 def tearDown(self):self.tmp.cleanup()
 def test_success_remains_read_only(self):
  with patch("gem_review_flow.verify_google_credential",return_value="owner"):
   stage=self.flow.prepare("verified",*self.args)
   result=self.flow.confirm("verified",*self.args,stage["review_nonce"],stage["csrf_token"],stage["review_digest"])
  self.assertTrue(result["confirmed"]);self.assertFalse(result["github_write_enabled"])
 def test_replay_denied(self):
  with patch("gem_review_flow.verify_google_credential",return_value="owner"):
   s=self.flow.prepare("verified",*self.args)
   a=self.flow.confirm("verified",*self.args,s["review_nonce"],s["csrf_token"],s["review_digest"])
   b=self.flow.confirm("verified",*self.args,s["review_nonce"],s["csrf_token"],s["review_digest"])
  self.assertTrue(a["confirmed"]);self.assertFalse(b["confirmed"])
 def test_changed_commit_denied(self):
  with patch("gem_review_flow.verify_google_credential",return_value="owner"):
   s=self.flow.prepare("verified",*self.args)
   changed=list(self.args);changed[3]="c"*40
   r=self.flow.confirm("verified",*changed,s["review_nonce"],s["csrf_token"],s["review_digest"])
  self.assertFalse(r["confirmed"])
 def test_unverified_identity_denied(self):
  with patch("gem_review_flow.verify_google_credential",side_effect=ValueError("invalid")):
   with self.assertRaises(ValueError):self.flow.prepare("forged",*self.args)
if __name__=="__main__":unittest.main()
