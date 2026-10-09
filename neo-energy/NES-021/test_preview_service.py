import tempfile
import unittest
from datetime import datetime,timedelta,timezone
from pathlib import Path
from preview_service import PreviewService
from secure_context import VerifiedSession,IdentityRejected
from persistent_ledger import SimulationStore

NOW=datetime(2026,10,8,tzinfo=timezone.utc)
TARIFF={"import_rate_usd_per_kwh":"0.2","export_credit_usd_per_kwh":"0.05",
        "fixed_charge_usd":"1"}

def example(record,site):
    return {"record_id":record,"site_id":site,"meter_id":"m",
      "interval_start_utc":"2026-10-08T00:00:00Z",
      "interval_end_utc":"2026-10-08T00:15:00Z","import_kwh":"10",
      "export_kwh":"2","quality":"simulated","source":"digital_twin"}

class PreviewTests(unittest.TestCase):
    def setUp(self):
        self.temp=tempfile.TemporaryDirectory()
        self.store=SimulationStore(str(Path(self.temp.name)/"preview.db"))
        self.store.ingest(example("r1","siteA"))
        self.store.ingest(example("r2","siteB"))
        self.grants={("subjectA","tenantA","siteA","energy.simulation.read"),
                     ("subjectB","tenantB","siteB","energy.simulation.read")}
        self.svc=PreviewService(store=self.store,issuer="neo-pass",audience="neo-energy",
            grants_provider=lambda sub,t,s,p:(sub,t,s,p) in self.grants)
    def tearDown(self):
        self.store.close()
        self.temp.cleanup()
    def session(self,subject="subjectA",**kwargs):
        data={"subject":subject,"issuer":"neo-pass","audience":"neo-energy",
              "expires_at":NOW+timedelta(minutes=15),"token_use":"energy-customer"}
        data.update(kwargs)
        return VerifiedSession(**data)
    def view(self,session=None,tenant="tenantA",site="siteA"):
        return self.svc.overview(session=session or self.session(),tenant_id=tenant,
             site_id=site,tariff=TARIFF,now=NOW)
    def test_good_preview(self):
        x=self.view()
        self.assertEqual(x["statement"]["illustrative_net_usd"],"2.90")
        self.assertTrue(x["not_a_bill"])
        self.assertFalse(x["dispatch_enabled"])
    def test_cross_tenant_denied(self):
        with self.assertRaises(IdentityRejected):self.view(tenant="tenantB",site="siteB")
    def test_cross_site_denied(self):
        with self.assertRaises(IdentityRejected):self.view(site="siteB")
    def test_revocation_immediate(self):
        self.grants.clear()
        with self.assertRaises(IdentityRejected):self.view()
    def test_identity_switch_not_cached(self):
        self.view()
        x=self.view(session=self.session(subject="subjectB"),tenant="tenantB",site="siteB")
        self.assertEqual(x["site_id"],"siteB")
        with self.assertRaises(IdentityRejected):
            self.view(session=self.session(subject="subjectB"))
    def test_expired_session(self):
        with self.assertRaises(IdentityRejected):
            self.view(session=self.session(expires_at=NOW-timedelta(seconds=1)))

if __name__=="__main__":unittest.main()
