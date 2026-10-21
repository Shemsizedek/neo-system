import importlib.util
import pathlib
import unittest
p=pathlib.Path(__file__).with_name("nous_checkpoint.py")
spec=importlib.util.spec_from_file_location("nous_checkpoint",p)
m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
class CheckpointTests(unittest.TestCase):
    def test_deterministic_receipt(self):
        head="a"*64
        self.assertEqual(m.pending_receipt(5,head),m.pending_receipt(5,head))
    def test_pending_is_not_confirmed(self):
        r=m.pending_receipt(1,"b"*64)
        self.assertTrue(m.verify_receipt(r))
        self.assertEqual(r["anchor_status"],"unanchored")
    def test_rewritten_head_rejected(self):
        r=m.pending_receipt(1,"b"*64);r["head_sha256"]="c"*64
        self.assertFalse(m.verify_receipt(r))
    def test_fake_confirmation_rejected(self):
        r=m.pending_receipt(1,"b"*64);r.update(anchor_status="confirmed",bitcoin_txid="a"*64,bitcoin_height=900000)
        self.assertFalse(m.verify_receipt(r))
    def test_independent_confirmation_requires_exact_commitment(self):
        r=m.pending_receipt(1,"b"*64);r.update(anchor_status="confirmed",bitcoin_txid="a"*64,bitcoin_height=900000)
        observed={"txid":"a"*64,"height":900000,"commitment_sha256":r["commitment_sha256"],"consensus_confirmed":True}
        self.assertTrue(m.verify_receipt(r,observed))
        observed["commitment_sha256"]="0"*64
        self.assertFalse(m.verify_receipt(r,observed))
    def test_invalid_sequence_rejected(self):
        with self.assertRaises(ValueError):m.pending_receipt(0,"a"*64)
