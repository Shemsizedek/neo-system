import pathlib,sys,unittest
sys.path.insert(0,str(pathlib.Path(__file__).parent))
from gem_identity_session import issue,verify,cookie_subject
class SessionTests(unittest.TestCase):
 def setUp(self):
  self.key=b"k"*32;self.sub="1234567890"
 def test_valid_short_lived(self):
  raw=issue(self.sub,self.key,now=100)
  self.assertEqual(verify(raw,self.key,now=101),self.sub)
 def test_reject_old_session(self):
  self.assertIsNone(verify(issue(self.sub,self.key,now=100),self.key,now=1000))
 def test_reject_wrong_key(self):
  self.assertIsNone(verify(issue(self.sub,self.key,now=100),b"z"*32,now=101))
 def test_reject_tamper(self):
  raw=issue(self.sub,self.key,now=100).replace(self.sub,"9999999999")
  self.assertIsNone(verify(raw,self.key,now=101))
 def test_cookie_reader(self):
  token=issue(self.sub,self.key,now=100)
  self.assertEqual(cookie_subject("neo_gem_approval="+token,self.key,now=101),self.sub)
 def test_old_chat_cookie_not_authorized(self):
  self.assertIsNone(cookie_subject("neo_gem_session=100.foo.bar",self.key,now=101))
if __name__=="__main__":unittest.main()
