"""NES-021 simulation preview authorization composition, no live auth tokens."""
from pathlib import Path
import sys
ROOT=Path(__file__).resolve().parents[1]
for gate in ("NES-015","NES-020"):
    sys.path.insert(0,str(ROOT/gate))
from customer_service import CustomerService
from secure_context import authorize_site

class PreviewService:
    def __init__(self, *, store, issuer, audience, grants_provider):
        self.issuer=issuer
        self.audience=audience
        self.grants_provider=grants_provider
        self.customer_service=CustomerService(store,lambda *_: False)

    def overview(self, *, session, tenant_id, site_id, tariff, now=None):
        subject=authorize_site(session=session,issuer=self.issuer,
            audience=self.audience,tenant_id=tenant_id,site_id=site_id,
            grants_provider=self.grants_provider,now=now)
        # A *new* per-request CustomerService prevents persistent identity scope.
        service=CustomerService(self.customer_service.store,
            lambda identity,requested_site,action:
                identity==subject and requested_site==site_id
                and action=="energy.simulation.read")
        result=service.overview(identity=subject,site_id=site_id,tariff=tariff)
        result["tenant_id"]=tenant_id
        result["preview_mode"]="SYNTHETIC_ONLY"
        return result
