import os
import tempfile
import unittest
from persistent_ledger import SimulationStore, LedgerError

def event(**patch):
    e={"record_id":"r1","site_id":"house-1","meter_id":"m1",
       "interval_start_utc":"2026-10-08T00:00:00Z",
       "interval_end_utc":"2026-10-08T00:15:00Z",
       "import_kwh":"1.25","export_kwh":"0.25",
       "quality":"simulated","source":"nes-digital-twin"}
    e.update(patch)
    return e

class Tests(unittest.TestCase):
    def setUp(self):
        self.tmp=tempfile.TemporaryDirectory()
        self.path=os.path.join(self.tmp.name,"energy.sqlite")
        self.s=SimulationStore(self.path)
    def tearDown(self):
        self.s.close()
        self.tmp.cleanup()
    def test_persistence(self):
        self.assertEqual(self.s.ingest(event()),"accepted_simulation_only")
        self.s.close()
        self.s=SimulationStore(self.path)
        self.assertEqual(self.s.totals("house-1")["import_kwh"],"1.25")
        self.assertFalse(self.s.totals("house-1")["billing_eligible"])
    def test_idempotency_and_conflict(self):
        self.s.ingest(event())
        self.assertEqual(self.s.ingest(event()),"duplicate_ignored")
        with self.assertRaises(LedgerError): self.s.ingest(event(import_kwh="9"))
        self.assertEqual(self.s.totals("house-1")["record_count"],1)
    def test_overlap_rejected(self):
        self.s.ingest(event())
        with self.assertRaises(LedgerError):
            self.s.ingest(event(record_id="r2",interval_start_utc="2026-10-08T00:10:00Z",
                                interval_end_utc="2026-10-08T00:20:00Z"))
    def test_bad_data(self):
        for changes in ({"quality":"revenue_verified"},{"import_kwh":-1},
                        {"export_kwh":float("nan")},{"interval_end_utc":"2026-10-07T00:00:00Z"}):
            with self.assertRaises(LedgerError):
                self.s.ingest(event(**changes))
    def test_site_partition(self):
        self.s.ingest(event())
        self.s.ingest(event(record_id="r2",site_id="house-2"))
        self.assertEqual(self.s.totals("house-1")["record_count"],1)
        self.assertEqual(self.s.totals("house-2")["record_count"],1)

if __name__=="__main__":
    unittest.main()
