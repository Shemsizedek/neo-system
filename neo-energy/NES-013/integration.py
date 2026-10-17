"""Read-only NEO Energy integration orchestration. No payment or physical commands."""
from pathlib import Path
import sys
ROOT = Path(__file__).resolve().parents[1]
for module in ("NES-008", "NES-009", "NES-010", "NES-011"):
    sys.path.insert(0, str(ROOT / module))
from utility_ledger import SimulatedLedger
from community_statement import simulate_statement
from energy_credit import proposed_credit
from authorization import can_access

class EnergyPortalSimulator:
    def __init__(self):
        self.ledger = SimulatedLedger()

    def ingest_simulation(self, reading):
        if reading.get("quality") != "simulated":
            raise ValueError("simulation pipeline accepts only explicitly synthetic readings")
        return self.ledger.ingest(reading)

    def customer_view(self, *, role, verified_identity, site_id, granted_sites,
                      import_rate, export_rate, fixed_charge=0):
        if not can_access(role=role, action="statement.simulated.read",
                          requested_site=site_id, granted_sites=granted_sites,
                          verified_identity=verified_identity):
            raise PermissionError("site or identity not authorized")
        energy = self.ledger.simulation_totals(site_id)
        statement = simulate_statement(import_kwh=energy["import_kwh"],
                                       export_kwh=energy["export_kwh"],
                                       import_rate_usd_per_kwh=import_rate,
                                       export_credit_usd_per_kwh=export_rate,
                                       fixed_charge_usd=fixed_charge)
        credit = proposed_credit(verified_export_kwh=energy["export_kwh"],
                                 tariff_credit_usd_per_kwh=export_rate,
                                 meter_quality="simulated", tariff_approved=False)
        return {
            "site_id": site_id,
            "energy": energy,
            "statement": statement,
            "credit": credit,
            "environment": "SIMULATION_ONLY",
            "physical_dispatch_enabled": False
        }
