"""NEO Nous OS append-only registry protocol: fail closed on conflicting history.

Backend is injected; production requires independent append-only storage with
atomic compare-and-append and separately witnessed checkpoints.
"""
from audit_chain import ZERO, chain_event
from nous_checkpoint import pending_receipt

class ConflictError(Exception): pass

class EvidenceRegistry:
    def __init__(self, store):
        self.store=store
    def append(self,event,expected_sequence,expected_head):
        if not isinstance(event,dict) or type(expected_sequence) is not int:
            raise ValueError("invalid append")
        if expected_sequence<0:
            raise ValueError("invalid sequence")
        actual_sequence,actual_head=self.store.head()
        if (actual_sequence,actual_head)!=(expected_sequence,expected_head):
            raise ConflictError("conflicting history")
        candidate=chain_event(expected_sequence+1,expected_head,event)
        if not self.store.compare_append(expected_sequence,expected_head,candidate):
            raise ConflictError("concurrent append or rewrite attempt")
        return candidate
    def checkpoint(self):
        n,digest=self.store.head()
        if n<1:
            raise ValueError("cannot checkpoint empty history")
        return pending_receipt(n,digest)
    def verify_against_witness(self,witness):
        n,digest=self.store.head()
        wn,wd=witness
        if n<wn or (n==wn and digest!=wd):
            return False
        return self.store.verify_from_anchor(wn,wd)

class InMemoryTestStore:
    """TEST ONLY: not durable, independently witnessed, or tamper-proof."""
    def __init__(self):
        self.records=[]
    def head(self):
        return (len(self.records),self.records[-1]["sha256"] if self.records else ZERO)
    def compare_append(self,n,head,record):
        if self.head()!=(n,head):
            return False
        self.records.append(record)
        return True
    def verify_from_anchor(self,n,digest):
        if n==0:
            return digest==ZERO
        if n>len(self.records) or self.records[n-1]["sha256"]!=digest:
            return False
        from audit_chain import chain_event
        previous=digest
        for idx in range(n,len(self.records)):
            item=self.records[idx]
            if item!=chain_event(idx+1,previous,item["event"]):
                return False
            previous=item["sha256"]
        return True
