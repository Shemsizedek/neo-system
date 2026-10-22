import importlib.util
import pathlib
import unittest
p=pathlib.Path(__file__).with_name("anchor_adapter.py")
spec=importlib.util.spec_from_file_location("anchor_adapter",p)
m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
from nous_checkpoint import pending_receipt
class AnchorTests(unittest.TestCase):
    def test_unanchored_never_confirmed(self):
        r=pending_receipt(1,"a"*64)
        self.assertFalse(m.evaluate_anchor(r,None)["bitcoin_confirmed"])
    def test_false_evidence_rejected(self):
        r=pending_receipt(1,"a"*64)
        r.update(anchor_status="confirmed",bitcoin_txid="b"*64,bitcoin_height=1000)
        self.assertFalse(m.evaluate_anchor(r,{"consensus_confirmed":False})["bitcoin_confirmed"])
    def test_correlated_counterparty_requires_bitcoin_evidence(self):
        r=pending_receipt(1,"a"*64)
        r.update(anchor_status="confirmed",bitcoin_txid="b"*64,bitcoin_height=1000)
        x={"bitcoin_txid":"b"*64,"commitment_sha256":r["commitment_sha256"],"source_verified":True}
        self.assertFalse(m.evaluate_anchor(r,None,x)["counterparty_correlated"])
