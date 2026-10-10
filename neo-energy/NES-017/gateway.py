"""NEO Energy standard library read-only WSGI simulation gateway.

Demo credentials are *never* issued by this server. The caller must inject
a separately audited authentication/authorization provider. Refuses startup otherwise.
"""
import json
from urllib.parse import unquote

class GatewayConfigurationError(RuntimeError): pass

def create_app(*, customer_service, verified_session_provider=None):
    if verified_session_provider is None:
        raise GatewayConfigurationError("verified session provider required")
    def app(environ, start_response):
        method=environ.get("REQUEST_METHOD","GET")
        path=environ.get("PATH_INFO","")
        headers=[("Content-Type","application/json; charset=utf-8"),
                 ("Cache-Control","no-store"),("X-Content-Type-Options","nosniff")]
        def respond(status, data):
            start_response(status,headers)
            return [json.dumps(data).encode("utf-8")]
        if method != "GET":
            return respond("405 Method Not Allowed",{"error":"read_only"})
        prefix="/v1/energy/customer/sites/"
        if not path.startswith(prefix) or not path.endswith("/overview"):
            return respond("404 Not Found",{"error":"not_found"})
        segment=path[len(prefix):-len("/overview")]
        site=unquote(segment).strip("/")
        if not site or "/" in site or len(site)>128:
            return respond("400 Bad Request",{"error":"invalid_site_id"})
        try:
            # Provider must verify signed session, issuer, expiry, CSRF/session policy,
            # and return trusted principal and *server-defined* simulation tariff.
            ctx=verified_session_provider(environ)
            if not isinstance(ctx,dict) or not ctx.get("principal") or "tariff" not in ctx:
                return respond("401 Unauthorized",{"error":"unauthenticated"})
            result=customer_service.overview(identity=ctx["principal"],site_id=site,
                                            tariff=ctx["tariff"])
            return respond("200 OK",result)
        except PermissionError:
            return respond("403 Forbidden",{"error":"forbidden"})
        except (ValueError,TypeError):
            return respond("400 Bad Request",{"error":"invalid_request"})
    return app
