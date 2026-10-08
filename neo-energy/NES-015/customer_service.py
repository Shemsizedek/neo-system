"""NES-015 read-only customer service: authorization is injected, never inferred."""
from pathlib import Path
import sys

ROOT=Path(__file__).resolve().parents[1]
for gate in ("NES-014", "NES-009"):
    sys.path.insert(0,str(ROOT/gate))
from persistent_ledger import SimulationStore
from community_statement import simulate_statement

class AccessDenied(PermissionError):
    pass

class CustomerService:
    def __init__(self, store, authorization):
        """authorization(identity, site_id, permission)->bool; verified provider required."""
        self.store=store
        self.authorization=authorization

    def overview(self, *, identity, site_id, tariff):
        if identity is None or not self.authorization(identity,site_id,"energy.simulation.read"):
            raise AccessDenied("customer identity or site grant denied")
        required=("import_rate_usd_per_kwh","export_credit_usd_per_kwh","fixed_charge_usd")
        if any(key not in tariff for key in required):
            raise ValueError("incomplete simulation tariff")
        readings=self.store.totals(site_id)
        statement=simulate_statement(
            import_kwh=readings["import_kwh"],
            export_kwh=readings["export_kwh"],
            import_rate_usd_per_kwh=tariff["import_rate_usd_per_kwh"],
            export_credit_usd_per_kwh=tariff["export_credit_usd_per_kwh"],
            fixed_charge_usd=tariff["fixed_charge_usd"])
        return {"site_id":site_id,"measurement":readings,"statement":statement,
                "not_a_bill":True,"dispatch_enabled":False,
                "settlement_enabled":False}
