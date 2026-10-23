import tempfile,unittest,os
from types import SimpleNamespace
from guardian_staging import GuardianStagingHarness

class TestStagingIntegration(unittest.TestCase):
    def setUp(self):
        a=tempfile.NamedTemporaryFile(delete=False);b=tempfile.NamedTemporaryFile(delete=False)
        self.paths=[a.name,b.name];a.close();b.close()
        self.h=GuardianStagingHarness(*self.paths)
    def tearDown(self):
        self.h.registry.db.close();self.h.sessions.conn.close()
        for p in self.paths:os.unlink(p)
    def begin(self):
        return self.h.begin_enrollment("alice",SimpleNamespace(validated=True),now=100)
    def test_no_proof(self):
        with self.assertRaises(PermissionError):self.h.begin_enrollment("alice",None,100)
    def test_session_and_challenge(self):
        sid,csrf,challenge=self.begin()
        self.assertTrue(self.h.sessions.authorize(sid,csrf,"alice",101))
        self.assertTrue(self.h.registry.consume(challenge,"alice","enroll",now=101))
        self.assertFalse(self.h.registry.consume(challenge,"alice","enroll",now=102))
    def test_cross_account(self):
        sid,csrf,_=self.begin()
        with self.assertRaises(PermissionError):self.h.validate_enrollment_session("bob",sid,csrf,101)
    def test_revocation(self):
        sid,csrf,_=self.begin()
        self.assertTrue(self.h.revoke_session("alice",sid))
        with self.assertRaises(PermissionError):self.h.validate_enrollment_session("alice",sid,csrf,101)
    def test_expiry(self):
        sid,csrf,_=self.begin()
        with self.assertRaises(PermissionError):self.h.validate_enrollment_session("alice",sid,csrf,401)
    def test_remote_terminal_denied(self):
        with self.assertRaises(PermissionError):self.h.terminal("whoami")
if __name__=="__main__":unittest.main()
