import os,tempfile,unittest
from types import SimpleNamespace
from durable_sessions import DurableEnrollmentSessions
class TestDurableEnrollment(unittest.TestCase):
    def setUp(self):
        self.f=tempfile.NamedTemporaryFile(delete=False);self.f.close()
        self.store=DurableEnrollmentSessions(self.f.name)
    def tearDown(self):
        self.store.conn.close();os.unlink(self.f.name)
    def issue(self):return self.store.issue_verified("owner",SimpleNamespace(validated=True),now=100)
    def test_no_unverified_proof(self):
        with self.assertRaises(PermissionError):self.store.issue_verified("owner",now=100)
    def test_valid_session(self):
        sid,csrf=self.issue()
        self.assertTrue(self.store.authorize(sid,csrf,"owner",101))
    def test_cross_owner(self):
        sid,csrf=self.issue()
        self.assertFalse(self.store.authorize(sid,csrf,"other",101))
    def test_csrf(self):
        sid,csrf=self.issue()
        self.assertFalse(self.store.authorize(sid,"invalid","owner",101))
    def test_expired(self):
        sid,csrf=self.issue()
        self.assertFalse(self.store.authorize(sid,csrf,"owner",400))
    def test_revoked(self):
        sid,csrf=self.issue()
        self.assertFalse(self.store.revoke(sid,"other"))
        self.assertTrue(self.store.revoke(sid,"owner"))
        self.assertFalse(self.store.authorize(sid,csrf,"owner",101))
    def test_persist(self):
        sid,csrf=self.issue()
        self.store.conn.close();self.store=DurableEnrollmentSessions(self.f.name)
        self.assertTrue(self.store.authorize(sid,csrf,"owner",101))
    def test_secrets_not_stored_plaintext(self):
        sid,csrf=self.issue()
        self.assertIsNone(self.store.conn.execute("SELECT 1 FROM enrollment_sessions WHERE id_hash=? OR csrf_hash=?",(sid,csrf)).fetchone())
    def test_terminal_denied(self):
        with self.assertRaises(PermissionError):self.store.terminal()
if __name__=="__main__":unittest.main()
