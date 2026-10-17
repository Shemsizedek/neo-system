"""Pure, simulation-only energy statement projections. No production billing."""
from decimal import Decimal, InvalidOperation

class StatementError(ValueError):
    pass

def _amount(value):
    try:
        d = Decimal(str(value))
    except (InvalidOperation, ValueError) as exc:
        raise StatementError("invalid numeric value") from exc
    if not d.is_finite() or d < 0:
        raise StatementError("values must be finite and nonnegative")
    return d

def simulate_statement(*, import_kwh, export_kwh, import_rate_usd_per_kwh,
                       export_credit_usd_per_kwh, fixed_charge_usd=0):
    imp = _amount(import_kwh)
    exp = _amount(export_kwh)
    retail = _amount(import_rate_usd_per_kwh)
    export_rate = _amount(export_credit_usd_per_kwh)
    fixed = _amount(fixed_charge_usd)
    import_charge = imp * retail
    credit = exp * export_rate
    net = import_charge + fixed - credit
    return {
        "status": "SIMULATED_NOT_A_BILL",
        "import_kwh": str(imp),
        "export_kwh": str(exp),
        "import_energy_charge_usd": str(import_charge.quantize(Decimal("0.01"))),
        "export_credit_usd": str(credit.quantize(Decimal("0.01"))),
        "fixed_charge_usd": str(fixed.quantize(Decimal("0.01"))),
        "illustrative_net_usd": str(net.quantize(Decimal("0.01"))),
        "payment_due": False,
        "transferable_credit": False,
        "field_control_authorized": False
    }
