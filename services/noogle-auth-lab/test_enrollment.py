import unittest
from unittest.mock import patch
from types import SimpleNamespace
from registry import Registry
from enrollment import EnrollmentCoordinator

class EnrollmentTests(unittest.TestCase):
    def setUp(self):
        self.db=Registry(":memory:");self.e=EnrollmentCoordinator(self.db)
    def tearDown(self): self.db.db.close()
    def test_requires_login(self):
        with self.assertRaises(PermissionError):self.e.start("")
    def test_pinned_rp(self):
        self.assertEqual(self.e.start("alice").rp_id,"connect.holytemples.org")
    @patch("enrollment.verify_new_credential")
    def test_registration_requires_crypto_verification(self,mock_verify):
        mock_verify.side_effect=ValueError("bad authenticator")
        challenge=self.e.start("alice").challenge
        with self.assertRaises(ValueError):self.e.finish("alice",challenge,{})
        self.assertFalse(self.db.active("alice","aWQ"))
    @patch("enrollment.verify_new_credential")
    def test_success_and_replay_rejection(self,mock_verify):
        mock_verify.return_value=SimpleNamespace(credential_id=b"id",public_key=b"public",sign_count=0)
        challenge=self.e.start("alice").challenge
        self.assertEqual(self.e.finish("alice",challenge,{}),"aWQ")
        self.assertTrue(self.db.active("alice","aWQ"))
        with self.assertRaises(PermissionError):self.e.finish("alice",challenge,{})
    @patch("enrollment.verify_new_credential")
    def test_cross_account_rejection(self,mock_verify):
        mock_verify.return_value=SimpleNamespace(credential_id=b"id",public_key=b"public",sign_count=0)
        challenge=self.e.start("alice").challenge
        with self.assertRaises(PermissionError):self.e.finish("bob",challenge,{})
    def test_terminal_disabled(self):
        with self.assertRaises(PermissionError):self.e.terminal()
if __name__=="__main__": unittest.main()
