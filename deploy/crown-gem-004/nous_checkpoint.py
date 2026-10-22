"""NEO Nous OS audit checkpoint receipts. Verification only; never signs/broadcasts.

An anchor is provisional until externally verified against Bitcoin consensus.
Only independent, read-only evidence can promote a receipt to confirmed status.
"""
import hashlib
import hmac
import json
import re

TXID = re.compile(r"^[0-9a-fA-F]{64}$")
DIGEST = re.compile(r"^[0-9a-f]{64}$")
DOMAIN = "NEO-NOUS-AUDIT-CHECKPOINT-V1"

def commitment(sequence, head_sha256):
    if type(sequence) is not int or sequence < 1 or not isinstance(head_sha256,str) or not DIGEST.fullmatch(head_sha256):
        raise ValueError("invalid audit checkpoint")
    message = json.dumps({"domain":DOMAIN,"sequence":sequence,"head_sha256":head_sha256},
                         sort_keys=True,separators=(",",":"))
    return hashlib.sha256(message.encode("utf-8")).hexdigest()

def pending_receipt(sequence, head_sha256):
    return {"schema":"neo.nous.audit.checkpoint.v1","sequence":sequence,
            "head_sha256":head_sha256,"commitment_sha256":commitment(sequence,head_sha256),
            "anchor_status":"unanchored","bitcoin_txid":None,"bitcoin_height":None}

def verify_receipt(receipt, independently_observed=None):
    try:
        expected=commitment(receipt["sequence"],receipt["head_sha256"])
        if not hmac.compare_digest(expected,receipt["commitment_sha256"]):
            return False
        status=receipt.get("anchor_status")
        if status=="unanchored":
            return receipt.get("bitcoin_txid") is None and receipt.get("bitcoin_height") is None
        if status!="confirmed" or not isinstance(independently_observed,dict):
            return False
        txid=receipt.get("bitcoin_txid")
        height=receipt.get("bitcoin_height")
        return (isinstance(txid,str) and TXID.fullmatch(txid) is not None
                and type(height) is int and height>0
                and independently_observed.get("txid")==txid
                and independently_observed.get("height")==height
                and independently_observed.get("commitment_sha256")==expected
                and independently_observed.get("consensus_confirmed") is True)
    except (TypeError,KeyError,ValueError):
        return False
