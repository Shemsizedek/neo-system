import unittest
from datetime import datetime, timedelta, timezone
from challenge_state import ChallengeStore, TerminalPolicy

T=datetime(2026,10,14,tzinfo=timezone.utc)
class TestPreproductionSecurity(unittest.TestCase):
    def setUp(self): self.s=ChallengeStore(60)
    def test_once_only(self):
        c=self.s.issue("u1","registration",T)
        self.assertTrue(self.s.consume(c,"u1","registration",T+timedelta(seconds=1)))
        self.assertFalse(self.s.consume(c,"u1","registration",T+timedelta(seconds=2)))
    def test_unknown(self): self.assertFalse(self.s.consume("invalid","u1","registration",T))
    def test_wrong_user(self):
        c=self.s.issue("u1","registration",T)
        self.assertFalse(self.s.consume(c,"u2","registration",T))
    def test_wrong_purpose(self):
        c=self.s.issue("u1","registration",T)
        self.assertFalse(self.s.consume(c,"u1","authentication",T))
    def test_expiry(self):
        c=self.s.issue("u1","authentication",T)
        self.assertFalse(self.s.consume(c,"u1","authentication",T+timedelta(seconds=60)))
    def test_future_clock(self):
        c=self.s.issue("u1","authentication",T)
        self.assertFalse(self.s.consume(c,"u1","authentication",T-timedelta(seconds=1)))
    def test_terminal_disabled(self):
        with self.assertRaises(PermissionError): TerminalPolicy.request("ls")
    def test_scope_validation(self):
        with self.assertRaises(ValueError): self.s.issue("u1","remote-shell",T)
if __name__=="__main__": unittest.main()
