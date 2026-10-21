"""Deterministic shared quota threshold, recovery, and concurrent-client tests.

No live traffic, credentials, or infrastructure changes required.
"""
import importlib.util
import pathlib
import threading
import unittest
from concurrent.futures import ThreadPoolExecutor

p=pathlib.Path(__file__).with_name("shared_quota.py")
spec=importlib.util.spec_from_file_location("load_quota",p)
quota=importlib.util.module_from_spec(spec)
spec.loader.exec_module(quota)

class AtomicValkey:
    def __init__(self):
        self.lock=threading.Lock()
        self.clock=0
        self.keys={}
    def eval(self, script, numkeys, key, window, limit):
        with self.lock:
            count,expiry=self.keys.get(key,(0,self.clock+int(window)))
            if self.clock>=expiry:
                count,expiry=0,self.clock+int(window)
            count+=1
            self.keys[key]=(count,expiry)
            return int(count<=int(limit))

class SharedQuotaLoadTests(unittest.TestCase):
    def test_exact_threshold_and_denial(self):
        store=AtomicValkey()
        self.assertEqual([quota.allowed(store,"client",3,60) for _ in range(5)],
                         [True,True,True,False,False])
    def test_window_recovery(self):
        store=AtomicValkey()
        self.assertTrue(quota.allowed(store,"client",1,60))
        self.assertFalse(quota.allowed(store,"client",1,60))
        store.clock=60
        self.assertTrue(quota.allowed(store,"client",1,60))
    def test_concurrent_instances_share_one_atomic_limit(self):
        store=AtomicValkey()
        with ThreadPoolExecutor(max_workers=12) as pool:
            results=list(pool.map(lambda _:quota.allowed(store,"same-peer",30,60),range(120)))
        self.assertEqual(sum(results),30)
    def test_independent_principals(self):
        store=AtomicValkey()
        self.assertTrue(quota.allowed(store,"peer-a",1,60))
        self.assertFalse(quota.allowed(store,"peer-a",1,60))
        self.assertTrue(quota.allowed(store,"peer-b",1,60))

if __name__=="__main__":
    unittest.main()
