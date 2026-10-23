import unittest
from community_statement import simulate_statement, StatementError

class StatementTests(unittest.TestCase):
    def test_basic(self):
        s=simulate_statement(import_kwh=100,export_kwh=20,import_rate_usd_per_kwh="0.20",
            export_credit_usd_per_kwh="0.05",fixed_charge_usd=10)
        self.assertEqual(s["illustrative_net_usd"],"29.00")
        self.assertFalse(s["payment_due"])
        self.assertEqual(s["status"],"SIMULATED_NOT_A_BILL")

    def test_credit_exceeds_charges(self):
        s=simulate_statement(import_kwh=0,export_kwh=100,import_rate_usd_per_kwh="0.1",
            export_credit_usd_per_kwh="0.2")
        self.assertEqual(s["illustrative_net_usd"],"-20.00")
        self.assertFalse(s["transferable_credit"])

    def test_bad_input(self):
        for value in (-1,float("nan"),float("inf"),"oops"):
            with self.assertRaises(StatementError):
                simulate_statement(import_kwh=value,export_kwh=0,import_rate_usd_per_kwh=0.1,
                    export_credit_usd_per_kwh=0)

if __name__ == "__main__":
    unittest.main()
