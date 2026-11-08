# GLOBAL-NEO-IP — IPv6/ASN Independent Routing Feasibility (NO-SPEND)

Date: 2026-11-08
Status: RESEARCH / NO RESOURCE REQUEST SUBMITTED / NO BGP ANNOUNCEMENTS AUTHORIZED

## Distinguish the three forms of addressing

1. `10.144.0.0/16` is RFC1918 PRIVATE NEO VPN space; NEO may coordinate member devices inside this overlay, but cannot advertise it as global public space.
2. Provider-assigned public IPv4/IPv6 can make the gateway reachable today on an existing eligible host. This does NOT establish NEO-owned globally portable number resources.
3. Independent publicly routable IPv6: request/justify eligible resources from ARIN for a United States based operational network, then use contracted upstream transit/peering, suitable routers and BGP announcement policies. ASN registration and IPv6 assignment are separate actions. Public prefixes are not usable on the Internet merely because software defines them.

## Official ARIN source checkpoints (reviewed November 8, 2026)

- https://www.arin.net/resources/guide/request/
- https://www.arin.net/resources/request/asn.html
- https://www.arin.net/resources/guide/ipv6/first_request/
- https://www.arin.net/participate/policy/nrpm/
- https://www.arin.net/resources/fees/fee_schedule/
- https://www.arin.net/resources/fees/fee_schedule/2027_fee_schedule/

ARIN NRPM section 5: an organization may request a single ASN; extra ASNs need justification. Do not assume an ASN itself conveys public prefix holdings or active transit.

ARIN end-user IPv6 eligibility (NRPM 6.5.8): possible pathways include immediate multihoming with valid global ASN, use of at least 2000 IPv6 addresses or 200 /64 subnets within 12 months, 13 active sites within 12 months, prior justified IPv4 allocation, or reasoned technical unsuitability of upstream-assigned space. An eligible minimum end-user assignment can be /48. Match an authentic eligible network and applicant entity to actual evidence, not forecasts represented as installed equipment. IPv6 ISPs/allocators have different requirements.

2026 ARIN RSP fee categories include 3X-Small at $275/year (up to /40 IPv6) and 2X-Small at $550/year (larger than /40 through /36); temporary waiver may keep an eligible /36 in 3X-Small through Dec 31, 2026. ARIN 2027 schedule effective Jan 1 lists 3X-Small $288.75/year and 2X-Small $577.50/year; temporary /36 fee waiver expires Dec 31, 2026. ARIN also lists a $50 organization-create transaction fee. Actual cost depends on the entity's entire holdings, category, eligibility and additional infrastructure/transit charges. Verify current schedule again before any submission.

## Recommendation with no new spending

PHASE I — Continue private VPN on an EXISTING already-paid/approved host if it passes gateway safety and reachable UDP checks. Use provider-assigned public IP for WireGuard gateway. A free static website host does not provide a persistent user-managed UDP VPN endpoint. Do not create a VM or reserved IP just to claim a free trial; confirm billing and recurring costs first.

PHASE II — Build an IPv6/ASN evidence packet:
- legal applicant entity and authorized point of contact
- ARIN Org ID / registration status (if any)
- physical operating presence and technical contact
- node inventory, multi-location topology, expected real subnets/customers
- public IPv6 business case: why provider addressing fails, and whether multihoming is intended
- upstream options with documented IPv6 transit and BGP route acceptance
- router/edge firewall, prefix-filter and DDoS practices, route objects, RPKI ROAs, reverse DNS, abuse contact and monitoring
- monthly/annual budget including ARIN, hosting, transit, redundancy, hardware, remote hands, abuse response and disaster recovery
- full authorization to apply and pay, separately from the engineering plan

PHASE III — Start a private lab using documentation prefix `2001:db8::/32` ONLY for non-routed examples and BGP planning. NEVER advertise `2001:db8::/32` or any unassigned global prefix. For an internal IPv6-only lab choose an RFC4193 ULA /48 using collision-resistant local generation and keep it private.

PHASE IV — After authorization and registered resources are verified, deploy independently routed IPv6 using BGP, ingress/egress filtering, RPKI and provider acceptance checks. Require looking-glass/traceroute validation from multiple AS networks, failover drill, abuse response, and documented routing authority before public launch.

## Decision

No ASN application, address allocation, BGP routing change, paid service, public enrollment, or financial commitment is authorized or claimed as completed by this research gate.
