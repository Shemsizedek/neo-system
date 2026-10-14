import os, tempfile, unittest
from session_policy import Sessions

class SessionPolicyTests(unittest.TestCase):
    def setUp(self):
        fd,self.path=tempfile.mkstemp();os.close(fd)
        self.s=Sessions(self.path)
    def tearDown(self):
        self.s.db.close();os.unlink(self.path)
    def test_no_unverified_session(self):
        with self.assertRaises(PermissionError):self.s.create_verified("alice")
    def test_valid_scoped_session(self):
        token=self.s.create_verified("alice",True,now=100)
        self.assertTrue(self.s.check(token,"alice",now=101))
        self.assertFalse(self.s.check(token,"bob",now=101))
    def test_expiration(self):
        token=self.s.create_verified("alice",True,now=100)
        self.assertFalse(self.s.check(token,"alice",now=1000))
    def test_revocation(self):
        token=self.s.create_verified("alice",True,now=100)
        self.assertFalse(self.s.revoke(token,"bob"))
        self.assertTrue(self.s.revoke(token,"alice"))
        self.assertFalse(self.s.check(token,"alice",now=101))
    def test_no_raw_tokens_in_db(self):
        token=self.s.create_verified("alice",True,now=100)
        self.assertIsNone(self.s.db.execute("SELECT 1 FROM sessions WHERE token_hash=?",(token,)).fetchone())
    def test_no_terminal(self):
        with self.assertRaises(PermissionError):self.s.command("ls")
if __name__=="__main__":unittest.main()
