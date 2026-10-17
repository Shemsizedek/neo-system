import unittest
from integration import EnergyPortalSimulator

def example(site_id="house-1", record_id="r1"):
    return dict(record_id=record_id, site_id=site_id, meter_id="meter-1",
                interval_start_utc="2026-10-08T00:00:00Z",
                interval_end_utc="2026-10-08T00:15:00Z",
                import_kwh="10", export_kwh="2",
                quality="simulated", source="digital_twin")

class IntegrationTests(unittest.TestCase):
    def setUp(self):
        self.app = EnergyPortalSimulator()
        self.app.ingest_simulation(example())

    def view(self, **kwargs):
        payload = dict(role="CUSTOMER_READ", verified_identity=True,
                       site_id="house-1", granted_sites=["house-1"],
                       import_rate="0.20", export_rate="0.05", fixed_charge="1")
        payload.update(kwargs)
        return self.app.customer_view(**payload)

    def test_end_to_end_statement(self):
        x=self.view()
        self.assertEqual(x["statement"]["illustrative_net_usd"], "2.90")
        self.assertEqual(x["credit"]["estimated_credit_usd"], "0.10")
        self.assertFalse(x["statement"]["payment_due"])
        self.assertFalse(x["credit"]["transferable"])
        self.assertFalse(x["physical_dispatch_enabled"])

    def test_cross_site_denied(self):
        with self.assertRaises(PermissionError):
            self.view(site_id="house-2")
    def test_unverified_identity_denied(self):
        with self.assertRaises(PermissionError):
            self.view(verified_identity=False)
    def test_field_operator_denied(self):
        with self.assertRaises(PermissionError):
            self.view(role="FIELD_OPERATOR")
    def test_nonsynthetic_rejected(self):
        with self.assertRaises(ValueError):
            self.app.ingest_simulation(example(record_id="r2") | {"quality":"revenue_verified"})
    def test_duplicate_no_double_count(self):
        self.assertEqual(self.app.ingest_simulation(example()),"duplicate_ignored")
        self.assertEqual(self.view()["energy"]["import_kwh"],"10")

if __name__=="__main__":
    unittest.main()
