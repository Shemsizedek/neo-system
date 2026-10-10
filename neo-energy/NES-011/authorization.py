"""Deterministic authorization helper; not a JWT verifier or production auth layer."""
ALLOWED = {
    "CUSTOMER_READ": frozenset({"site.read", "statement.simulated.read"}),
    "UTILITY_SUPPORT": frozenset({"support.case.read", "support.case.reply"}),
    "METER_AUDITOR": frozenset({"meter.audit.read"}),
    "ENGINEER_REVIEWER": frozenset({"engineering.review.read"}),
}

def can_access(*, role, action, requested_site, granted_sites, verified_identity=False):
    return bool(verified_identity and requested_site and requested_site in set(granted_sites)
                and action in ALLOWED.get(role, frozenset()))
