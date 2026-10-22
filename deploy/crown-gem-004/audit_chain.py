"""Deterministic tamper-evident audit chain format (storage-agnostic).

A durable, independently controlled append-only store must enforce sequencing
and persist the last accepted hash. This module does not claim durability.
"""
import hashlib
import hmac
import json

ZERO="0"*64
def canonical(value):
    return json.dumps(value,sort_keys=True,separators=(",",":"),ensure_ascii=True)
def chain_event(sequence,previous,event):
    if type(sequence) is not int or sequence<1:
        raise ValueError("invalid sequence")
    if not isinstance(previous,str) or len(previous)!=64 or any(c not in "0123456789abcdef" for c in previous):
        raise ValueError("invalid previous digest")
    record={"sequence":sequence,"previous_sha256":previous,"event":event}
    record["sha256"]=hashlib.sha256(canonical(record).encode("utf-8")).hexdigest()
    return record
def verify(records,anchor=ZERO):
    previous=anchor
    for index,record in enumerate(records,1):
        if record.get("sequence")!=index or not hmac.compare_digest(record.get("previous_sha256",""),previous):
            return False
        expected=chain_event(index,previous,record.get("event"))
        if not hmac.compare_digest(record.get("sha256",""),expected["sha256"]):
            return False
        previous=expected["sha256"]
    return True
