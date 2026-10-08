"""NES-010 simulated credits, explicitly nonredeemable and nontransferable."""
from decimal import Decimal, InvalidOperation

class CreditError(ValueError):
    pass

def _d(x):
    try: n=Decimal(str(x))
    except (InvalidOperation, ValueError) as e: raise CreditError("invalid quantity") from e
    if not n.is_finite() or n < 0: raise CreditError("quantity must be nonnegative and finite")
    return n

def proposed_credit(*, verified_export_kwh, tariff_credit_usd_per_kwh,
                    meter_quality, tariff_approved=False):
    energy=_d(verified_export_kwh)
    rate=_d(tariff_credit_usd_per_kwh)
    estimate=(energy*rate).quantize(Decimal("0.01"))
    eligible=(meter_quality=="revenue_verified" and tariff_approved)
    return dict(status="SIMULATION_ONLY", estimated_credit_usd=str(estimate),
                future_eligibility_precheck=eligible, payable=False,
                transferable=False, ces_bridge_enabled=False,
                nomni_bridge_enabled=False)
