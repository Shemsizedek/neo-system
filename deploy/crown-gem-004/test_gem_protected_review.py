import pathlib,sys,unittest
from unittest.mock import patch
sys.path.insert(0,str(pathlib.Path(__file__).parent))
from gem_protected_review import mint_approval_cookie,review_response
from gem_identity_session import issue
class ProtectedReviewTests(unittest.TestCase):
 def setUp(self):
  self.secret=b"k"*32
  self.proposal=dict(repository="Shemsizedek/neo-system",base="feat/crown-gem-003-staging-bridge",head="gem-development/"+"a"*16,commit="b"*40,manifest_digest="a"*64,title="Safe review")
 def test_requires_approval_cookie(self):
  self.assertEqual(review_response("",self.secret,self.proposal)[0],401)
 def test_legacy_chat_cookie_rejected(self):
  self.assertEqual(review_response("neo_gem_session=123.foo.bar",self.secret,self.proposal)[0],401)
 def test_valid_google_bound_session(self):
  cookie="neo_gem_approval="+issue("1234567890",self.secret)
  status,headers,body=review_response(cookie,self.secret,self.proposal)
  self.assertEqual(status,200);self.assertIn("Read-only preview",body)
  self.assertIn("default-src 'none'",headers["Content-Security-Policy"])
 def test_bad_proposal(self):
  cookie="neo_gem_approval="+issue("1234567890",self.secret)
  self.proposal["repository"]="other/repo"
  self.assertEqual(review_response(cookie,self.secret,self.proposal)[0],400)
 def test_cookie_minted_only_after_google_verification(self):
  with patch("gem_protected_review.verify_google_credential",return_value="1234567890"):
   cookie=mint_approval_cookie("verified-token",self.secret)
  self.assertIn("HttpOnly; Secure; SameSite=Strict",cookie)
 def test_invalid_google_token_denied(self):
  with patch("gem_protected_review.verify_google_credential",side_effect=ValueError("bad token")):
   with self.assertRaises(ValueError):mint_approval_cookie("invalid",self.secret)
if __name__=="__main__":unittest.main()
