# PROJECT144-G010 — Identity-gateway verification

The authenticated verification script now recognizes explicit 401 and 403 denial responses. A 302 redirect is deliberately not accepted as proof of a secure identity policy. No publicly reachable service may be provisioned as a workaround.

Before release, verify the private service has no public ingress, that an approved identity gateway is in place, and that a private runner can reach the gateway. Run the explicit G007 acceptance workflow and independently test mobile and Chromebook authentication. Record build evidence separately from deployed service evidence. Do not issue the dashboard URL until each check passes.

**Current blocker:** Connected Render actions cannot provision a private service or an identity gateway. Operator console setup is required. The committed source is a release candidate, not a deployed product.
