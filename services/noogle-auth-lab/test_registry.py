import unittest, tempfile, os
from registry import Registry

class RegistryTests(unittest.TestCase):
    def setUp(self):
        self.temp=tempfile.NamedTemporaryFile(delete=False);self.temp.close()
        self.r=Registry(self.temp.name)
    def tearDown(self):
        self.r.db.close();os.unlink(self.temp.name)
    def test_single_use(self):
        t=self.r.issue("a","enroll",100)
        self.assertTrue(self.r.consume(t,"a","enroll",101))
        self.assertFalse(self.r.consume(t,"a","enroll",102))
    def test_wrong_owner_and_purpose(self):
        t=self.r.issue("a","enroll",100)
        self.assertFalse(self.r.consume(t,"b","enroll",101))
        self.assertFalse(self.r.consume(t,"a","authenticate",101))
    def test_expired(self):
        t=self.r.issue("a","enroll",100)
        self.assertFalse(self.r.consume(t,"a","enroll",220))
    def test_durable(self):
        t=self.r.issue("a","enroll",100)
        self.r.db.close();self.r=Registry(self.temp.name)
        self.assertTrue(self.r.consume(t,"a","enroll",101))
    def test_enrollment_gated(self):
        with self.assertRaises(PermissionError): self.r.enroll_verified("a","d","pub")
    def test_revoke(self):
        self.r.enroll_verified("a","d","pub",True)
        with self.assertRaises(PermissionError):self.r.revoke("a","d")
        self.assertFalse(self.r.revoke("b","d",True))
        self.assertTrue(self.r.revoke("a","d",True))
        self.assertFalse(self.r.active("a","d"))
    def test_duplicate(self):
        self.r.enroll_verified("a","d","pub",True)
        with self.assertRaises(Exception): self.r.enroll_verified("a","d","pub",True)
    def test_terminal_disabled(self):
        with self.assertRaises(PermissionError):self.r.terminal()
if __name__=="__main__": unittest.main()
