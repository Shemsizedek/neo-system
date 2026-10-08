import unittest
from energy_credit import proposed_credit, CreditError

class TestEnergyCredits(unittest.TestCase):
    def test_unverified_not_eligible(self):
        x=proposed_credit(verified_export_kwh="100",tariff_credit_usd_per_kwh=".05",
                          meter_quality="simulated",tariff_approved=True)
        self.assertFalse(x["future_eligibility_precheck"])
        self.assertEqual(x["estimated_credit_usd"],"5.00")
        self.assertFalse(x["payable"])
    def test_precheck_not_actual_settlement(self):
        x=proposed_credit(verified_export_kwh="4",tariff_credit_usd_per_kwh=".1",
                         meter_quality="revenue_verified",tariff_approved=True)
        self.assertTrue(x["future_eligibility_precheck"])
        self.assertFalse(x["transferable"])
        self.assertFalse(x["nomni_bridge_enabled"])
    def test_negative_rejected(self):
        with self.assertRaises(CreditError):
            proposed_credit(verified_export_kwh=-1,tariff_credit_usd_per_kwh=.05,
                            meter_quality="simulated")
if __name__=="__main__": unittest.main()
