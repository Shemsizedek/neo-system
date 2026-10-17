import unittest
from unittest.mock import patch
from types import SimpleNamespace
from webauthn_adapter import RP_ID, ORIGIN, decode_b64url, verify_new_credential, verify_existing_credential, VerifiedCredential
class TestWebAuthnAdapter(unittest.TestCase):
    def test_rp_binding(self):
        self.assertEqual(RP_ID,"connect.holytemples.org")
        self.assertEqual(ORIGIN,"https://connect.holytemples.org")
    def test_challenge_decoder(self):
        self.assertEqual(decode_b64url("YWJj"),b"abc")
        with self.assertRaises(ValueError):decode_b64url("")
    @patch("webauthn_adapter.verify_registration_response")
    def test_registration_enforces_user_verification(self,fn):
        fn.return_value=SimpleNamespace(credential_id=b"id",credential_public_key=b"key",sign_count=0)
        record=verify_new_credential({"id":"test"},"YWJj")
        self.assertEqual(record.public_key,b"key")
        self.assertTrue(fn.call_args.kwargs["require_user_verification"])
        self.assertEqual(fn.call_args.kwargs["expected_rp_id"],RP_ID)
        self.assertEqual(fn.call_args.kwargs["expected_origin"],ORIGIN)
    @patch("webauthn_adapter.verify_authentication_response")
    def test_authentication_uses_server_key(self,fn):
        cred=VerifiedCredential(b"id",b"pub",3)
        verify_existing_credential({"id":"test"},"YWJj",cred)
        self.assertEqual(fn.call_args.kwargs["credential_public_key"],b"pub")
        self.assertEqual(fn.call_args.kwargs["credential_current_sign_count"],3)
        self.assertTrue(fn.call_args.kwargs["require_user_verification"])
if __name__=="__main__":unittest.main()
