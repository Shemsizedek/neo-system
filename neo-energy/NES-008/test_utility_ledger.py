import unittest
from utility_ledger import SimulatedLedger, ReadingError

def fixture(**changes):
    value = dict(record_id="r1", site_id="house1", meter_id="m1",
                 interval_start_utc="2026-10-08T00:00:00Z",
                 interval_end_utc="2026-10-08T00:15:00Z",
                 import_kwh=1.25, export_kwh=0.4,
                 quality="simulated", source="digital_twin")
    value.update(changes)
    return value

class LedgerTests(unittest.TestCase):
    def test_ingest_and_idempotency(self):
        ledger = SimulatedLedger()
        self.assertEqual(ledger.ingest(fixture()), "accepted_simulation_only")
        self.assertEqual(ledger.ingest(fixture()), "duplicate_ignored")
        self.assertEqual(ledger.simulation_totals("house1")["import_kwh"], "1.25")
        self.assertFalse(ledger.simulation_totals("house1")["billing_eligible"])

    def test_conflicting_duplicate(self):
        ledger = SimulatedLedger()
        ledger.ingest(fixture())
        with self.assertRaises(ReadingError):
            ledger.ingest(fixture(import_kwh=8))

    def test_overlap_and_negative(self):
        ledger = SimulatedLedger()
        ledger.ingest(fixture())
        with self.assertRaises(ReadingError):
            ledger.ingest(fixture(record_id="r2",interval_start_utc="2026-10-08T00:10:00Z",interval_end_utc="2026-10-08T00:25:00Z"))
        with self.assertRaises(ReadingError):
            ledger.ingest(fixture(record_id="r3",import_kwh=-1))

    def test_invalid_period(self):
        with self.assertRaises(ReadingError):
            SimulatedLedger().ingest(fixture(interval_end_utc="2026-10-07T00:00:00Z"))

if __name__ == "__main__":
    unittest.main()
