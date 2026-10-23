import tempfile
import unittest
from pathlib import Path
from customer_service import CustomerService, AccessDenied
from persistent_ledger import SimulationStore

TARIFF=dict(import_rate_usd_per_kwh="0.20", export_credit_usd_per_kwh="0.05",
            fixed_charge_usd="1.00")

class CustomerAPITests(unittest.TestCase):
    def setUp(self):
        self.tmp=tempfile.TemporaryDirectory()
        self.store=SimulationStore(str(Path(self.tmp.name)/"test.db"))
        self.store.ingest(dict(record_id="r1",site_id="home1",meter_id="meter1",
            interval_start_utc="2026-10-08T00:00:00Z",
            interval_end_utc="2026-10-08T00:15:00Z",import_kwh="10",export_kwh="2",
            quality="simulated",source="digital_twin"))
        self.grants={"verified-customer":{"home1"}}
        self.service=CustomerService(self.store,
            lambda identity,site,permission: permission=="energy.simulation.read"
                and site in self.grants.get(identity,set()))
    def tearDown(self):
        self.store.close()
        self.tmp.cleanup()
    def test_authorized_statement(self):
        r=self.service.overview(identity="verified-customer",site_id="home1",tariff=TARIFF)
        self.assertEqual(r["statement"]["illustrative_net_usd"],"2.90")
        self.assertTrue(r["not_a_bill"])
        self.assertFalse(r["settlement_enabled"])
    def test_deny_unauthenticated(self):
        with self.assertRaises(AccessDenied):
            self.service.overview(identity=None,site_id="home1",tariff=TARIFF)
    def test_cross_site_denied(self):
        with self.assertRaises(AccessDenied):
            self.service.overview(identity="verified-customer",site_id="other",tariff=TARIFF)
    def test_missing_tariff_denied(self):
        with self.assertRaises(ValueError):
            self.service.overview(identity="verified-customer",site_id="home1",tariff={})
if __name__=="__main__": unittest.main()
